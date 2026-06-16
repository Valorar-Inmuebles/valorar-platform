"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  getConstanciaCuilUrl,
  getAnsesDashboard,
  getHistoriaLaboralUrl,
  getReciboConstanciaUrl,
  resetAnsesDashboardRequest,
  triggerAnsesClienteSync,
  updateAnsesPassword,
  updateAnsesSincronizacion,
} from "@/lib/api/anses.api";
import type { AnsesDashboardDto } from "@/lib/types/anses-dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardHeaderActions,
} from "@/components/ui/card";
import { TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Icon } from "@/components/ui/icons";
import { hasTooltipContent, Tooltip } from "@/components/ui/tooltip";
import { AnsesClienteSearch } from "@/components/modules/automatizaciones/anses-cliente-search";
import { AnsesFileDownload } from "@/components/modules/automatizaciones/anses-file-download";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@/components/ui/side-panel";
import { Input } from "@/components/ui/input";
import {
  ErrorMessage,
  FormField,
  HelperText,
  Label,
} from "@/components/ui/form-field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { ansesPasswordSchema, type AnsesPasswordInput } from "@/lib/validation/anses-password.schema";

const HISTORIA_LABORAL_PREVIEW_ROWS = 7;
const EXPEDIENTES_VINCULADOS_PREVIEW_ROWS = 3;
const BENEFICIOS_PREVIEW_ROWS = 3;
const RELACIONES_FAMILIARES_PREVIEW_ROWS = 3;

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-700">{value}</span>
    </div>
  );
}

function AnsesSectionEmpty() {
  return (
    <p className="text-xs text-zinc-400">No hay información disponible.</p>
  );
}

function getReciboPeriodoDownloadId(beneficioId: string, periodoId: string): string {
  const prefix = `${beneficioId}-`;
  return periodoId.startsWith(prefix) ? periodoId.slice(prefix.length) : periodoId;
}

function AnsesDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-full max-w-2xl" />
      <SkeletonCard />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

function AnsesDashboardContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clienteId = params.id;

  const [data, setData] = useState<AnsesDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [showHistoriaLaboralCompleta, setShowHistoriaLaboralCompleta] =
    useState(false);
  const [showExpedientesTodos, setShowExpedientesTodos] = useState(false);
  const [showBeneficiosTodos, setShowBeneficiosTodos] = useState(false);
  const [showRelacionesFamiliaresTodos, setShowRelacionesFamiliaresTodos] =
    useState(false);
  const [reciboBeneficioId, setReciboBeneficioId] = useState("");
  const [reciboPeriodoId, setReciboPeriodoId] = useState("");
  const [passwordPanelOpen, setPasswordPanelOpen] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTogglingSincronizacion, setIsTogglingSincronizacion] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<
    z.input<typeof ansesPasswordSchema>,
    any,
    z.output<typeof ansesPasswordSchema>
  >({
    resolver: zodResolver(ansesPasswordSchema),
    mode: "onBlur",
    defaultValues: { password: "" },
  });

  useEffect(() => {
    setShowHistoriaLaboralCompleta(false);
    setShowExpedientesTodos(false);
    setShowBeneficiosTodos(false);
    setShowRelacionesFamiliaresTodos(false);
    setReciboBeneficioId("");
    setReciboPeriodoId("");
  }, [clienteId, reloadToken]);

  useEffect(() => {
    if (!data?.recibos) return;
    setReciboBeneficioId(data.recibos.beneficioSeleccionado);
    setReciboPeriodoId(data.recibos.periodoSeleccionado);
  }, [data]);

  const recibosPeriodos = useMemo(() => {
    if (!data || !reciboBeneficioId) return [];
    const beneficioPrefix = `${reciboBeneficioId}-`;
    return data.recibos.periodos.filter((periodo) => periodo.value.startsWith(beneficioPrefix));
  }, [data, reciboBeneficioId]);

  useEffect(() => {
    if (!passwordPanelOpen) return;
    resetPasswordForm({ password: data?.cliente.passwordAnterior ?? "" });
    setShowPassword(false);
  }, [passwordPanelOpen, resetPasswordForm, data?.cliente.passwordAnterior]);

  const reciboDetalle = useMemo(() => {
    if (!data) return null;
    return (
      data.recibos.items.find(
        (item) =>
          item.beneficioId === reciboBeneficioId && item.periodoId === reciboPeriodoId,
      ) ?? null
    );
  }, [data, reciboBeneficioId, reciboPeriodoId]);

  useEffect(() => {
    if (recibosPeriodos.length === 0) {
      if (reciboPeriodoId !== "") setReciboPeriodoId("");
      return;
    }
    if (!recibosPeriodos.some((periodo) => periodo.value === reciboPeriodoId)) {
      setReciboPeriodoId(recibosPeriodos[0]!.value);
    }
  }, [recibosPeriodos, reciboPeriodoId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const dashboard = await getAnsesDashboard(clienteId);
        if (!cancelled) {
          setData(dashboard);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setData(null);
          setError(e instanceof Error ? e.message : "Error al cargar datos");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [clienteId, reloadToken]);

  const retry = useCallback(() => {
    resetAnsesDashboardRequest(clienteId);
    setReloadToken((t) => t + 1);
  }, [clienteId]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await triggerAnsesClienteSync(clienteId);
      toast.success("Sincronización iniciada");
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo iniciar la sincronización ANSES",
      );
    } finally {
      setIsSyncing(false);
    }
  }, [clienteId, toast]);

  const handleToggleSincronizacion = useCallback(
    async (activa: boolean) => {
      if (!data) return;

      const previousActiva = data.sincronizacion.activa;
      setData({
        ...data,
        sincronizacion: {
          ...data.sincronizacion,
          activa,
        },
      });
      setIsTogglingSincronizacion(true);

      try {
        await updateAnsesSincronizacion(clienteId, activa);
        toast.success(
          activa ? "Sincronización activada" : "Sincronización desactivada",
        );
      } catch (e: unknown) {
        setData({
          ...data,
          sincronizacion: {
            ...data.sincronizacion,
            activa: previousActiva,
          },
        });
        toast.error(
          e instanceof Error
            ? e.message
            : "No se pudo actualizar la sincronización ANSES",
        );
      } finally {
        setIsTogglingSincronizacion(false);
      }
    },
    [clienteId, data, toast],
  );

  const handlePasswordSubmit = useCallback(
    async (values: AnsesPasswordInput) => {
      setIsSavingPassword(true);
      try {
        await updateAnsesPassword(clienteId, values.password);
        toast.success("Contraseña ANSES actualizada");
        setPasswordPanelOpen(false);
        retry();
      } catch (e: unknown) {
        toast.error(
          e instanceof Error ? e.message : "No se pudo actualizar la contraseña ANSES",
        );
      } finally {
        setIsSavingPassword(false);
      }
    },
    [clienteId, retry, toast],
  );

  if (loading) {
    return <AnsesDashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{error ?? "No se pudieron cargar los datos"}</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={retry}>
            Reintentar
          </Button>
          <Link
            href="/automatizaciones/anses"
            className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            Volver a buscar
          </Link>
        </div>
      </div>
    );
  }

  const relacionesFamiliaresItems = data.relacionesFamiliares.items;
  const hasMoreRelacionesFamiliares =
    relacionesFamiliaresItems.length > RELACIONES_FAMILIARES_PREVIEW_ROWS;
  const relacionesFamiliaresVisible = showRelacionesFamiliaresTodos
    ? relacionesFamiliaresItems
    : relacionesFamiliaresItems.slice(0, RELACIONES_FAMILIARES_PREVIEW_ROWS);
  const beneficiosItems = data.beneficios.items;
  const hasMoreBeneficios = beneficiosItems.length > BENEFICIOS_PREVIEW_ROWS;
  const beneficiosVisible = showBeneficiosTodos
    ? beneficiosItems
    : beneficiosItems.slice(0, BENEFICIOS_PREVIEW_ROWS);
  const expedientesTodos = [
    ...data.expedientesVinculados.items,
    ...data.expedientesVinculados.itemsCerrados,
  ];
  const hasMoreExpedientes =
    expedientesTodos.length > EXPEDIENTES_VINCULADOS_PREVIEW_ROWS;
  const expedientesVisible = showExpedientesTodos
    ? expedientesTodos
    : expedientesTodos.slice(0, EXPEDIENTES_VINCULADOS_PREVIEW_ROWS);
  const historiaLaboralFilas = data.historiaLaboral.filas;
  const hasMoreHistoriaLaboral =
    historiaLaboralFilas.length > HISTORIA_LABORAL_PREVIEW_ROWS;
  const historiaLaboralVisible = showHistoriaLaboralCompleta
    ? historiaLaboralFilas
    : historiaLaboralFilas.slice(0, HISTORIA_LABORAL_PREVIEW_ROWS);

  return (
    <>
    <div className="space-y-6">
      <div className="space-y-4">
        <PageHeader
          title="Información ANSES"
          breadcrumb={[
            { label: "Inicio", href: "/" },
            { label: "Automatizaciones", href: "/automatizaciones/anses" },
            { label: "Legajos ANSES" },
          ]}
        />
        <p className="text-sm text-gray-500">
          Consulta y gestiona información oficial de ANSES por cliente.
        </p>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <AnsesClienteSearch
            containerClassName="max-w-xl min-w-[200px] flex-1"
            onSelect={(cliente) => {
              if (cliente.id !== clienteId) {
                router.push(`/automatizaciones/anses/${cliente.id}`);
              }
            }}
          />
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700">
            <span className="max-w-[500px] truncate">{data.cliente.chipLabel}</span>
            <Link
              href={data.links.verEnCliente}
              className="shrink-0 border-l border-gray-200 pl-2 text-gray-600 transition-colors hover:text-gray-900"
            >
              Ver en cliente
            </Link>
            <ActionIconButton
              aria-label="Quitar cliente"
              onClick={() => router.push("/automatizaciones/anses")}
            >
              <span className="text-gray-400">×</span>
            </ActionIconButton>
          </div>
          <Button
            type="button"
            variant={data.cliente.estadoPassword && data.cliente.tienePassword ? "secondary" : "primary"}
            size="md"
            onClick={() => setPasswordPanelOpen(true)}
          >
            {data.cliente.tienePassword ? "Cambiar contraseña ANSES" : "Establecer contraseña ANSES"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
          <Card flat>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <Avatar usuarioId="" name={data.cliente.nombre} size="lg" />
                <div className="min-w-0 space-y-2">
                  <h2 className="text-base font-semibold text-gray-900">
                    {data.cliente.nombre}
                  </h2>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-5 text-sm">
                    <InfoRow label="DNI" value={data.cliente.dni} />
                    <InfoRow label="CUIL" value={data.cliente.cuil} />
                    <InfoRow
                      label="F. nacimiento"
                      value={data.cliente.fechaNacimiento != "" ? `${data.cliente.fechaNacimiento} (${data.cliente.edad} años)` : ""}
                    />
                    <InfoRow label="Nacionalidad" value={data.cliente.nacionalidad} />
                    <InfoRow label="Estado civil" value={data.cliente.estadoCivil} />
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <p className="text-xs text-gray-400">
                  Última sincronización:{" "}
                  <span className="font-medium text-gray-600">{data.sincronizacion.ultima}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Switch
                    size="sm"
                    aria-label="Activar sincronización ANSES"
                    checked={data.sincronizacion.activa}
                    disabled={isTogglingSincronizacion}
                    onChange={(event) => {
                      void handleToggleSincronizacion(event.target.checked);
                    }}
                  />
                  <Badge variant={data.sincronizacion.estado.variant} tooltip={data.sincronizacion.estado.tooltip}>
                    {data.sincronizacion.estado.label}
                  </Badge>
                  <ActionIconButton
                    aria-label="Actualizar"
                    disabled={isSyncing}
                    onClick={() => void handleSync()}
                  >
                    <Icon.Refresh
                      className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`}
                    />
                  </ActionIconButton>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card flat>
              <CardHeader>
                <CardTitle>Información personal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.informacionPersonal.campos.map((c) => (
                  <InfoRow key={c.label} label={c.label} value={c.value} />
                ))}
                <AnsesFileDownload
                  variant="button"
                  buttonVariant="secondary"
                  buttonSize="sm"
                  url={getConstanciaCuilUrl(clienteId)}
                  // filename="ConstanciaCUIL.pdf"
                  label="Descargar constancia CUIL"
                  className="mt-2 "
                />
              </CardContent>
            </Card>

            <Card flat>
              <CardHeader>
                <CardTitle>Relaciones familiares</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {relacionesFamiliaresItems.length === 0 ? (
                  <AnsesSectionEmpty />
                ) : (
                  <>
                    {relacionesFamiliaresVisible.map((f) => (
                      <div key={f.id} className="space-y-0.5 border-b border-gray-100 pb-2 last:border-0">
                        <p className="text-xs text-gray-400">{f.tipo}</p>
                        <p className="text-xs font-medium text-gray-800">
                          {f.nombre}
                        </p>
                        <p className="text-xs text-gray-500">CUIL {f.cuil}</p>
                        {f.fecha && (
                          <p className="text-xs text-gray-400">Desde: {f.fecha}</p>
                        )}
                      </div>
                    ))}
                    {hasMoreRelacionesFamiliares && !showRelacionesFamiliaresTodos && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setShowRelacionesFamiliaresTodos(true)}
                      >
                        Ver todas (${data.relacionesFamiliares.items.length})
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card flat>
              <CardHeader>
                <CardTitle>Beneficios previsionales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {beneficiosItems.length === 0 ? (
                  <AnsesSectionEmpty />
                ) : (
                  <>
                    {beneficiosVisible.map((b) => (
                      <div key={b.id} className="space-y-1 border-b border-gray-100 pb-2 last:border-0">
                        <Badge variant={b.estado.variant}>{b.estado.label}</Badge>
                        <p className="text-xs font-medium text-gray-800">{b.numero}</p>
                        <p className="text-xs text-gray-500">{b.descripcion}</p>
                      </div>
                    ))}
                    {hasMoreBeneficios && !showBeneficiosTodos && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setShowBeneficiosTodos(true)}
                      >
                        Ver todos ({beneficiosItems.length})
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card flat>
              <CardHeader>
                <CardTitle>Expedientes ANSES vinculados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {expedientesTodos.length === 0 ? (
                  <AnsesSectionEmpty />
                ) : (
                  <>
                    {expedientesVisible.map((e) => {
                      const showInfo = hasTooltipContent(e.tooltip ?? "");
                      const showDownload =
                        e.tieneArchivo && e.archivoUrl && e.archivoNombre;
                      const showActions = showInfo || showDownload;

                      return (
                        <div
                          key={e.id}
                          className="flex gap-2 border-b border-gray-100 pb-2 last:border-0"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <Badge variant={e.estado.variant}>{e.estado.label}</Badge>
                            <p className="text-xs font-medium text-gray-800">{e.numero}</p>
                            <p className="text-xs text-gray-500">{e.tramite}</p>
                          </div>
                          {showActions && (
                            <div className="flex w-6 shrink-0 flex-col items-center self-stretch">
                              {showInfo && (
                                <Tooltip content={e.tooltip ?? ""}>
                                  <span
                                    className="inline-flex size-6 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-600"
                                    aria-label="Más información"
                                  >
                                    <Icon.Info className="size-3.5" />
                                  </span>
                                </Tooltip>
                              )}
                              {showDownload && (
                                <AnsesFileDownload
                                  variant="icon"
                                  url={e.archivoUrl!}
                                  // filename={e.archivoNombre!}
                                  className={`text-zinc-400 hover:text-zinc-600${showInfo ? " mt-auto" : ""}`}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {hasMoreExpedientes && !showExpedientesTodos && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="justify-start"
                        onClick={() => setShowExpedientesTodos(true)}
                      >
                        Ver todos ({data.expedientesVinculados.total})
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[3fr_2fr]">
            <Card flat>
              <CardHeader>
                <CardTitle>Historia laboral</CardTitle>
                {
                  data.historiaLaboral.filas.length > 0 && (
                    <CardHeaderActions>
                      <AnsesFileDownload
                        variant="button"
                        buttonSize="sm"
                        buttonVariant="secondary"
                        url={getHistoriaLaboralUrl(clienteId)}
                        // filename="HistoriaLaboral.pdf"
                        label="Descargar historia laboral"
                        className="justify-start text-xs font-medium"
                      />
                    </CardHeaderActions>
                  )
                }
              </CardHeader>
              <CardContent className="p-0">
                <>
                  {historiaLaboralFilas.length === 0 ? (
                    <div className="px-5 py-4">
                      <AnsesSectionEmpty />
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <TableHeader>
                            <TableRow>
                              <TableCell isHeader>Empleador</TableCell>
                              <TableCell isHeader>CUIL</TableCell>
                              <TableCell isHeader>Desde</TableCell>
                              <TableCell isHeader>Hasta</TableCell>
                            </TableRow>
                          </TableHeader>
                          <tbody>
                            {historiaLaboralVisible.map((row, i) => (
                              <TableRow key={`${row.cuit}-${row.desde}-${i}`}>
                                <TableCell>{row.razonSocial}</TableCell>
                                <TableCell>{row.cuit}</TableCell>
                                <TableCell>{row.desde}</TableCell>
                                <TableCell>{row.hasta}</TableCell>
                              </TableRow>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {hasMoreHistoriaLaboral && !showHistoriaLaboralCompleta && (
                        <div className="border-t border-gray-100 px-5 py-3">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="justify-start"
                            onClick={() => setShowHistoriaLaboralCompleta(true)}
                          >
                            Ver historia laboral completa ({historiaLaboralFilas.length})
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </>
              </CardContent>
            </Card>

            <Card flat>
              <CardHeader>
                <CardTitle>Recibos de haberes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Select
                    options={data.recibos.beneficios}
                    value={reciboBeneficioId}
                    onChange={setReciboBeneficioId}
                    placeholder="Beneficio"
                  />
                  <Select
                    options={recibosPeriodos}
                    value={reciboPeriodoId}
                    onChange={setReciboPeriodoId}
                    placeholder="Período"
                    disabled={recibosPeriodos.length === 0}
                  />
                </div>
                {reciboDetalle ? (
                  <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                    <InfoRow label="Haber bruto" value={reciboDetalle.haberBruto} />
                    <InfoRow label="Descuentos" value={reciboDetalle.descuentos} />
                    <InfoRow label="Haber neto" value={reciboDetalle.haberNeto} />
                    <InfoRow label="Fecha de pago" value={reciboDetalle.fechaPago} />
                  </div>
                ) : (
                  <AnsesSectionEmpty />
                )}
                {reciboDetalle && (
                  <div className="flex flex-col gap-1">
                    <AnsesFileDownload
                      variant="button"
                      buttonVariant="secondary"
                      buttonSize="sm"
                      url={getReciboConstanciaUrl(
                        clienteId,
                        getReciboPeriodoDownloadId(reciboBeneficioId, reciboPeriodoId),
                        reciboBeneficioId,
                      )}
                      // filename="constanciaHaberes.pdf"
                      label="Descargar PDF"
                      className="justify-start text-xs font-medium"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
      </div>
    </div>
    <SidePanel
      open={passwordPanelOpen}
      onClose={() => setPasswordPanelOpen(false)}
      width="sm"
    >
      <SidePanelHeader>
        <SidePanelTitle>{data.cliente.tienePassword ? "Cambiar contraseña ANSES" : "Establecer contraseña ANSES"}</SidePanelTitle>
        <SidePanelDescription>
          {data.cliente.tienePassword ? "Vas a cambiar la contraseña de acceso a ANSES de este cliente." : "Vas a establecer la contraseña de acceso a ANSES de este cliente."}
        </SidePanelDescription>
      </SidePanelHeader>
      <SidePanelContent>
        <form
          id="anses-password-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.stopPropagation();
            void handleSubmit(handlePasswordSubmit)(e);
          }}
        >
          <FormField
            id="anses-password"
            state={passwordErrors.password ? "error" : "default"}
          >
            <Label required>Nueva contraseña</Label>
            <div className="relative">
              <Input
                id="anses-password"
                type={showPassword ? "text" : "password"}
                placeholder="Ingresá la nueva contraseña"
                autoComplete="new-password"
                className="pr-16"
                state={passwordErrors.password ? "error" : "default"}
                {...register("password")}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 inline-flex items-center gap-1 px-2 text-xs text-zinc-500 transition-colors hover:text-zinc-700"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <Icon.Eye className="size-3.5" />
                <span>{showPassword ? "Ocultar" : "Ver"}</span>
              </button>
            </div>
            {passwordErrors.password ? (
              <ErrorMessage>{passwordErrors.password.message}</ErrorMessage>
            ) : (
              <HelperText>
                La contraseña se usará para futuras sincronizaciones ANSES.
              </HelperText>
            )}
          </FormField>
        </form>
      </SidePanelContent>
      <SidePanelFooter>
        <Button
          type="button"
          variant="secondary"
          disabled={isSavingPassword}
          onClick={() => setPasswordPanelOpen(false)}
        >
          Cancelar
        </Button>
        <Button form="anses-password-form" type="submit" loading={isSavingPassword}>
          Aceptar cambios
        </Button>
      </SidePanelFooter>
    </SidePanel>
    </>
  );
}

export default function AnsesDashboardPage() {
  return <AnsesDashboardContent />;
}
