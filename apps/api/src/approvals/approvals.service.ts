import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { ApprovalDecisionType, ApprovalStatus, Prisma, UserRole } from '@erp/db'
import { PrismaService } from '../common/prisma.service'
import { pageParams, paged } from '../common/pagination'

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  async findFlows(tenantId: string, entityType?: string) {
    return this.prisma.approvalFlow.findMany({
      where: {
        tenantId,
        ...(entityType && { entityType }),
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findFlowById(id: string, tenantId: string) {
    const flow = await this.prisma.approvalFlow.findFirst({
      where: { id, tenantId },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    })
    if (!flow) {
      throw new NotFoundException('Approval flow not found')
    }
    return flow
  }

  async createFlow(tenantId: string, data: {
    name: string
    description?: string
    entityType: string
    steps: Array<{
      order: number
      role: UserRole
      requiredCount: number
    }>
  }) {
    return this.prisma.approvalFlow.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        entityType: data.entityType,
        steps: {
          create: data.steps.map((step) => ({
            order: step.order,
            role: step.role,
            requiredCount: step.requiredCount,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    })
  }

  async updateFlow(id: string, tenantId: string, data: {
    name?: string
    description?: string
    isActive?: boolean
  }) {
    await this.findFlowById(id, tenantId)

    return this.prisma.approvalFlow.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    })
  }

  async deleteFlow(id: string, tenantId: string) {
    await this.findFlowById(id, tenantId)
    return this.prisma.approvalFlow.delete({
      where: { id },
    })
  }

  // Requests
  async findRequests(tenantId: string, params?: { status?: string; entityType?: string; page?: number | string; limit?: number | string }) {
    const shouldPage = params?.page !== undefined
    const { page, limit, skip } = pageParams(params ?? {}, 50, 200)
    const status = params?.status && Object.values(ApprovalStatus).includes(params.status as ApprovalStatus) ? params.status as ApprovalStatus : undefined
    const where: Prisma.ApprovalRequestWhereInput = {
      tenantId,
      ...(status && { status }),
      ...(params?.entityType && { entityType: params.entityType }),
    }
    const include = {
      approvalFlow: true,
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      decisions: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    } satisfies Prisma.ApprovalRequestInclude

    const [rows, total] = await Promise.all([
      this.prisma.approvalRequest.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: shouldPage ? skip : undefined,
        take: shouldPage ? limit : 50,
      }),
      shouldPage ? this.prisma.approvalRequest.count({ where }) : Promise.resolve(0),
    ])

    return shouldPage ? paged(rows, total, page, limit) : rows
  }

  async findRequestById(id: string, tenantId: string) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id, tenantId },
      include: {
        approvalFlow: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        decisions: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })
    if (!request) {
      throw new NotFoundException('Approval request not found')
    }
    return request
  }

  async createRequest(tenantId: string, data: {
    approvalFlowId: string
    entityType: string
    entityId: string
    requestedById: string
  }) {
    const flow = await this.prisma.approvalFlow.findFirst({
      where: { id: data.approvalFlowId, tenantId },
    })
    if (!flow) {
      throw new NotFoundException('Approval flow not found')
    }

    return this.prisma.approvalRequest.create({
      data: {
        tenantId,
        approvalFlowId: data.approvalFlowId,
        entityType: data.entityType,
        entityId: data.entityId,
        requestedById: data.requestedById,
      },
    })
  }

  async createDecision(tenantId: string, requestId: string, data: {
    userId: string
    decision: ApprovalDecisionType
    notes?: string
  }) {
    const request = await this.findRequestById(requestId, tenantId)
    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Request is not pending')
    }
    if (request.decisions.some((decision) => decision.userId === data.userId)) {
      throw new ConflictException('User already decided this request')
    }

    const decision = await this.prisma.approvalDecision.create({
      data: {
        approvalRequestId: requestId,
        userId: data.userId,
        decision: data.decision,
        notes: data.notes,
      },
    })

    // Check if all required approvals are met
    await this.updateRequestStatus(requestId)

    return decision
  }

  private async updateRequestStatus(requestId: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: {
        approvalFlow: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
        decisions: {
          include: {
            user: {
              select: { role: true },
            },
          },
        },
      },
    })

    if (!request) return
    if (request.decisions.some((decision) => decision.decision === ApprovalDecisionType.REJECT)) {
      await this.prisma.approvalRequest.update({
        where: { id: requestId },
        data: { status: ApprovalStatus.REJECTED },
      })
      return
    }

    const flow = request.approvalFlow
    const steps = flow.steps

    for (const step of steps) {
      const stepDecisions = request.decisions.filter((d) => d.decision === ApprovalDecisionType.APPROVE && d.user.role === step.role)
      const requiredApprovals = step.requiredCount

      if (stepDecisions.length < requiredApprovals) {
        // Still pending
        return
      }
    }

    // All steps approved
    await this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status: ApprovalStatus.APPROVED },
    })
  }

  async cancelRequest(tenantId: string, requestId: string) {
    const request = await this.findRequestById(requestId, tenantId)
    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Request is not pending')
    }

    return this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status: ApprovalStatus.CANCELLED },
    })
  }
}
