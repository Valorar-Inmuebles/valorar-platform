export type CurrentUserDto = {
  id: string;
  nombre: string;
  email: string;
  has_foto: boolean;
  is_super_usuario: boolean;
  roles: string[];
  view_tenant_id: string | null;
  view_tenant_nombre: string | null;
};
