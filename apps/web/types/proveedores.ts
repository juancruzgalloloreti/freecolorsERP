export type Proveedor = {
  id: string;
  razonSocial: string;
  cuit?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  condicionIva?: string | null;
  condicionPago?: string | null;
  notas?: string | null;
  createdAt?: string;
};