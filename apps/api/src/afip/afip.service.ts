import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'

@Injectable()
export class AfipService {
  constructor(private prisma: PrismaService) {}

  async getCredential(tenantId: string) {
    const credential = await this.prisma.afipCredential.findUnique({
      where: { tenantId },
    })
    return credential
  }

  private async requireCredential(tenantId: string) {
    const credential = await this.getCredential(tenantId)
    if (!credential) {
      throw new NotFoundException('AFIP credential not found')
    }
    return credential
  }

  async createCredential(tenantId: string, data: {
    cuit: string
    cert: string
    privateKey: string
    environment: 'TESTING' | 'PRODUCTION'
    expiresAt: string
  }) {
    const existing = await this.prisma.afipCredential.findUnique({
      where: { tenantId },
    })
    if (existing) {
      throw new BadRequestException('AFIP credential already exists for this tenant')
    }

    return this.prisma.afipCredential.create({
      data: {
        tenantId,
        cuit: data.cuit,
        cert: data.cert,
        privateKey: data.privateKey,
        environment: data.environment,
        expiresAt: new Date(data.expiresAt),
      },
    })
  }

  async updateCredential(tenantId: string, data: {
    cuit?: string
    cert?: string
    privateKey?: string
    environment?: 'TESTING' | 'PRODUCTION'
    expiresAt?: string
  }) {
    const credential = await this.requireCredential(tenantId)

    return this.prisma.afipCredential.update({
      where: { tenantId },
      data: {
        ...(data.cuit !== undefined && { cuit: data.cuit }),
        ...(data.cert !== undefined && { cert: data.cert }),
        ...(data.privateKey !== undefined && { privateKey: data.privateKey }),
        ...(data.environment !== undefined && { environment: data.environment }),
        ...(data.expiresAt !== undefined && { expiresAt: new Date(data.expiresAt) }),
      },
    })
  }

  async deleteCredential(tenantId: string) {
    await this.requireCredential(tenantId)
    return this.prisma.afipCredential.delete({
      where: { tenantId },
    })
  }

  async testConnection(tenantId: string) {
    const credential = await this.requireCredential(tenantId)
    const isExpired = new Date(credential.expiresAt) < new Date()

    if (isExpired) {
      return {
        connected: false,
        environment: credential.environment,
        expiresAt: credential.expiresAt,
        message: 'Credentials expired',
      }
    }

    return {
      connected: true,
      environment: credential.environment,
      expiresAt: credential.expiresAt,
      message: 'Connection test successful (stub — real SOAP not implemented)',
    }
  }

  // NOT IMPLEMENTED: AFIP SOAP integration
  // Requires AFIP WSAA/wsfev1 SOAP client:
  // - login() → WSAA authentication (loginTicket)
  // - requestCAE() → wsfev1.FECAESolicitar
  // - getReceipt() → wsfev1.FECompConsultar
  // When implementing, inject via interface to keep testability
}
