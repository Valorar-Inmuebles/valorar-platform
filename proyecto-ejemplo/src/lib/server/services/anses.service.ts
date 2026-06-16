import {
  ansesClienteRepository,
  type AnsesClienteRow,
} from "@/BBDD/repositories/anses-cliente.repository";
import { clienteRepository } from "@/BBDD/repositories/cliente.repository";
import { personaRepository } from "@/BBDD/repositories/persona.repository";
import { personaPrevisionalRepository } from "@/BBDD/repositories/persona-previsional.repository";
import type {
  AnsesDashboardDto,
  AnsesOverviewDto,
  AnsesRelacionFamiliar,
  AnsesHistoriaLaboralRow,
  AnsesExpedienteVinculado,
  AnsesBadgeStatus,
  AnsesReciboDetalle,
  AnsesSelectOption,
  AnsesBeneficio
} from "@/lib/types/anses-dashboard";
import { AnsesTipoLog } from "@/lib/types/enums";
import type { BadgeVariant } from "@/components/ui/badge";
import { currencyFormatter } from "@/lib/formatting";
import { formatFechaLocal } from "@/lib/validation/common/formatters";
import { decrypt } from "@/lib/server/services/anses-crypt";
import { formatDisplayDateTime } from "@/lib/datetime/format-display-datetime";
import { isValidAnioMesWithinLast12Months } from "@/lib/datetime/anses-anio-mes";

import type { ServerContext } from "@/lib/server/context/types";
import { authService } from "@/lib/server/services/auth.service";
import {
  ansesStorage,
  StorageObjectNotFoundError,
} from "@/lib/server/storage";

type AnsesDbCtx = Pick<ServerContext, "tenant_id" | "is_superadmin">;
type AnsesServiceCtx = AnsesDbCtx & Pick<ServerContext, "user">;
const RECIBO_BENEFICIO_JUBILACION = "Jubilacion";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export type AnsesArchivoFile = {
  filename: string;
  content: ArrayBuffer;
  contentType: string;
};

type ReciboHaberesArchivoKind = "constancia";

const RECIBO_HABERES_FILES: Record<ReciboHaberesArchivoKind, string> = {
  constancia: "ReciboHaberes.pdf",
};
const RECIBO_HABERES_FILES_TOCLIENT: Record<ReciboHaberesArchivoKind, string> = {
  constancia: "{0}-{1}-ReciboHaberes.pdf",
};



function parseAnsesDatos(datos: AnsesClienteRow["datos"]): unknown {
  if (datos === null || datos === undefined) return null;
  if (typeof datos === "object") return datos;
  if (typeof datos === "string") {
    const trimmed = datos.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return datos;
    }
  }
  return datos;
}

/** Último registro (por `created_at`) que coincide con `tipo` y `datos_ref`. */
export function getLatestRegistroByTipoAndDatosRef(
  registros: AnsesClienteRow[],
  tipo: AnsesTipoLog
): AnsesClienteRow | null {
  const tipoNorm = tipo.toString();
  if (!tipoNorm) return null;

  let latest: AnsesClienteRow | null = null;

  for (const row of registros) {
    if (row.tipo !== tipoNorm) continue;

    if (!latest || row.created_at > latest.created_at) {
      latest = row;
    }
  }

  return latest;
}

export function getRegistrosByTipoAndDatosRef(
  registros: AnsesClienteRow[],
  tipo: AnsesTipoLog
): AnsesClienteRow[] | null {
  const tipoNorm = tipo.toString();
  if (!tipoNorm) return null;

  let rows: AnsesClienteRow[] = [];

  for (const row of registros) {
    if (row.tipo !== tipoNorm) continue;
    rows.push(row);
  }

  return rows;
}

type AnsesJobParams = Record<string, string>;

async function runAnsesJob(
  ctx: Pick<ServerContext, "user">,
  options: { job: string; params?: AnsesJobParams },
): Promise<void> {
  const baseUrl = process.env.ANSES_JOBS_URL?.trim().replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("Servicio de sincronización ANSES no configurado");
  }

  const accessToken = await authService.issueServiceToken(ctx.user.id);

  const url = new URL(`${baseUrl}/run`);
  url.searchParams.set("job", options.job);
  url.searchParams.set("esperarProcesamiento", "false");

  for (const [key, value] of Object.entries(options.params ?? {})) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(
      body.trim() || `Error al iniciar sincronización (${res.status})`,
    );
    err.cause = {
      type: "anses_job",
      job: options.job,
      params: options.params ?? {},
      jobUrl: url.toString(),
      httpStatus: res.status,
    };
    throw err;
  }
}


export const ansesService = {
  async getOverview(_ctx: AnsesDbCtx): Promise<AnsesOverviewDto> {
    const baseUrl = process.env.ANSES_JOBS_URL?.trim().replace(/\/$/, "");
    if (!baseUrl) {
      throw new Error("ANSES_JOBS_URL no configurada");
    }

    const url = new URL(`${baseUrl}/health`);
    const res = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(5_000),
    });

    let activa = false;
    let ultimaSyncClientes = "";
    let proximaSyncClientes = "";
    let sincronizadosHoy = 0;
    let conErrorHoy = 0;
    let ultimaSyncSentencias = "";
    let proximaSyncSentencias = "";
    let corriendo = false;
    if (res.ok) {
      const data = await res.json();
      //   {
      //     "clientes": {
      //         "lastRunAt": "2026-06-03T22:37:37.488Z",
      //         "nextRunAt": "2026-06-04T14:39:00.000Z",
      //     },
      //     "clientesHoy": {
      //         "conError": 0,
      //         "fecha": "2026-06-03",
      //         "sincronizados": 0
      //     },
      //     "cronEnabled": true,
      //     "jobRunning": false,
      //     "priorityQueueLength": 0,
      //     "processStartedAt": "2026-06-03T22:37:37.464Z",
      //     "queueLength": 0,
      //     "sentencias": {
      //         "lastRunAt": "2026-06-03T22:37:39.723Z",
      //         "nextRunAt": "2026-06-13T06:00:00.000Z",
      //     },
      //     "status": "ok"
      // }
      activa = data.status == "ok" && data.cronEnabled;
      ultimaSyncClientes = formatDisplayDateTime(data.clientes.lastRunAt);
      proximaSyncClientes = formatDisplayDateTime(data.clientes.nextRunAt);
      ultimaSyncSentencias = formatDisplayDateTime(data.sentencias.lastRunAt);
      proximaSyncSentencias = formatDisplayDateTime(data.sentencias.nextRunAt);
      sincronizadosHoy = data.clientesHoy.sincronizados;
      conErrorHoy = data.clientesHoy.conError;
      corriendo = data.jobRunning;
    }

    return {
      integracion: {
        activa: activa,
        ultimaSyncClientes: ultimaSyncClientes,
        proximaSyncClientes: proximaSyncClientes,
        ultimaSyncSentencias: ultimaSyncSentencias,
        proximaSyncSentencias: proximaSyncSentencias,
        corriendo: corriendo,
      },
      metricas: {
        titulo: "Métricas rápidas (hoy)",
        items: [
          { label: "Clientes sincronizados", value: sincronizadosHoy },
          // { label: "Novedades detectadas", value: 7 },
          // { label: "Expedientes nuevos", value: 2 },
          { label: "Errores de sync", value: conErrorHoy },
        ],
      },
      logs: {
        verTodoLabel: "Ver todo",
        items: [
          {
            id: "l1",
            mensaje: "Sincronización completada — Pérez, Marta Alicia",
            timestamp: "Hace 2 horas",
            dotColor: "green",
          },
          {
            id: "l2",
            mensaje: "Novedad detectada en beneficio jubilatorio",
            timestamp: "Hace 5 horas",
            dotColor: "orange",
          },
          {
            id: "l3",
            mensaje: "Error temporal de conexión ANSES (reintentado)",
            timestamp: "Ayer 18:42",
            dotColor: "red",
          },
          {
            id: "l4",
            mensaje: "Cruce mensual abril iniciado",
            timestamp: "Ayer 09:00",
            dotColor: "blue",
          },
        ],
      },
    };
  },

  async getExpedienteArchivo(
    ctx: AnsesServiceCtx,
    clienteId: string,
    expedienteId: string,
  ): Promise<AnsesArchivoFile> {
    const trimmedExpedienteId = expedienteId?.trim();
    if (!trimmedExpedienteId) {
      throw new Error("Parámetros requeridos");
    }

    //Esto lo hace para ver si el cliente existe y pertenece al tenant, sinó da error
    const { cuil } = await resolveStorageClienteId(ctx, clienteId);
    const storagePath = `${clienteId}/Expedientes/Expediente-${trimmedExpedienteId}.pdf`;

    return downloadAnsesStorageFile(storagePath, `${cuil}-Expediente-${trimmedExpedienteId}.pdf`);
  },

  async getReciboConstanciaArchivo(
    ctx: AnsesServiceCtx,
    clienteId: string,
    beneficioId: string,
    periodoId: string,
  ): Promise<AnsesArchivoFile> {
    return getReciboHaberesArchivo(ctx, clienteId, beneficioId, periodoId, "constancia");
  },

  async getConstanciaCuilArchivo(
    ctx: AnsesServiceCtx,
    clienteId: string,
  ): Promise<AnsesArchivoFile> {
    //Esto lo hace para ver si el cliente existe y pertenece al tenant, sinó da error
    const { cuil } = await resolveStorageClienteId(ctx, clienteId);
    const storagePath = `${clienteId}/ConstanciaCUIL.pdf`;

    return downloadAnsesStorageFile(storagePath, `${cuil}-ConstanciaCUIL.pdf`);
  },

  async getHistoriaLaboralArchivo(
    ctx: AnsesServiceCtx,
    clienteId: string,
  ): Promise<AnsesArchivoFile> {

    //Esto lo hace para ver si el cliente existe y pertenece al tenant, sinó da error
    const { cuil } = await resolveStorageClienteId(ctx, clienteId);
    const storagePath = `${clienteId}/HistoriaLaboral.pdf`;

    return downloadAnsesStorageFile(storagePath, `${cuil}-HistoriaLaboral.pdf`);
  },

  async updateAnsesPassword(
    ctx: AnsesServiceCtx,
    clienteId: string,
    password: string,
  ): Promise<void> {
    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      throw new Error("La contraseña es requerida");
    }

    const { personaId } = await resolveClientePersonaId(ctx, clienteId);
    await personaPrevisionalRepository.upsertSecretByPersonaId(
      ctx,
      personaId,
      trimmedPassword,
    );
  },

  async updateSincronizarAnses(
    ctx: AnsesServiceCtx,
    clienteId: string,
    activa: boolean,
  ): Promise<void> {
    const { personaId } = await resolveClientePersonaId(ctx, clienteId);
    await personaPrevisionalRepository.updateSincronizarAnsesByPersonaId(
      ctx,
      personaId,
      activa ? 1 : 0,
    );
  },

  async triggerClienteSync(ctx: AnsesServiceCtx, clienteId: string): Promise<void> {
    const trimmedClienteId = clienteId.trim();
    if (!trimmedClienteId) {
      throw new Error("Parámetros requeridos");
    }

    //Esto lo hace para ver si el cliente existe y pertenece al tenant, sinó da error
    await resolveClientePersonaId(ctx, trimmedClienteId);

    await runAnsesJob(ctx, {
      job: "clientes",
      params: { clienteId: trimmedClienteId },
    });
  },

  async triggerSentenciasSync(
    ctx: AnsesServiceCtx,
    anioMes: string,
  ): Promise<void> {
    const trimmed = anioMes.trim();
    if (!trimmed || !isValidAnioMesWithinLast12Months(trimmed)) {
      throw new Error("Parámetros requeridos");
    }

    await runAnsesJob(ctx, {
      job: "sentencias",
      params: { anioMes: trimmed },
    });
  },

  async triggerAllClientesSync(ctx: AnsesServiceCtx): Promise<void> {
    await runAnsesJob(ctx, { job: "clientes" });
  },

  async triggerTodoSync(ctx: AnsesServiceCtx): Promise<void> {
    await runAnsesJob(ctx, { job: "all" });
  },

  async getDashboard(ctx: AnsesServiceCtx, clienteId: string): Promise<AnsesDashboardDto> {
    const trimmed = clienteId?.trim();
    if (!trimmed) {
      throw new Error("ID requerido");
    }

    const cliente = await clienteRepository.getPersonaId(
      ctx,
      trimmed,
    );
    if (!cliente?.persona_id) throw new Error("Cliente no encontrado");

    const personaId = cliente.persona_id;
    const persona = await personaRepository.getById(ctx, personaId);
    const personaPrevisional = await personaPrevisionalRepository.getByPersonaId(ctx, personaId);
    const registros = await ansesClienteRepository.getAllByCliente(ctx, trimmed);

    /* Último registro (por `created_at`) */

    let ultimaSincronizacion;
    let estadoSincronizacionBadge: AnsesBadgeStatus;

    if (registros.length > 0 && registros[0]?.created_at) {
      ultimaSincronizacion = new Date(registros[0].created_at).toLocaleString();
      estadoSincronizacionBadge = { label: "Sincronizado", variant: "success" };
    }
    else {
      ultimaSincronizacion = "Sin sincronización";
      estadoSincronizacionBadge = { label: "No sincronizado", variant: "neutral" };
    }

    let EstadoPassword = true;

    if (personaPrevisional && personaPrevisional.estado_anses && personaPrevisional.estado_anses !== "") {
      if (personaPrevisional.estado_anses === "ERROR_CAMBIO_CLAVE") {
        estadoSincronizacionBadge = { label: "No sincronizado", variant: "danger", tooltip: "Es necesario cambiar la clave de acceso a ANSES." };
        EstadoPassword = false;
      } else if (personaPrevisional.estado_anses === "ERROR_PASSWORD") {
        estadoSincronizacionBadge = { label: "No sincronizado", variant: "danger", tooltip: "La clave de acceso a ANSES es incorrecta." };
        EstadoPassword = false;
      } else if (personaPrevisional.estado_anses === "ERROR_SECRET") {
        estadoSincronizacionBadge = { label: "No sincronizado", variant: "danger", tooltip: "La clave de acceso a ANSES no está definida." };
        EstadoPassword = false;
      } else if (personaPrevisional.estado_anses === "ERROR_VALIDAR_DATOS") {
        estadoSincronizacionBadge = { label: "No sincronizado", variant: "warning", tooltip: "Se requiere validación de datos de ANSES." };
        EstadoPassword = true;
      }
    }

    let tienePassword = true;
    let passwordAnterior = "";

    if (!personaPrevisional || (personaPrevisional?.secret ?? "").trim() === "") {
      tienePassword = false;
      estadoSincronizacionBadge = { label: "No sincronizado", variant: "neutral", tooltip: "La clave de acceso a ANSES no está definida." };
    }
    else if (personaPrevisional && personaPrevisional.secret && personaPrevisional.secret !== "") {
      //Piden mostrar la contraseña anterior si es que existe.
      passwordAnterior = decrypt(JSON.parse(personaPrevisional.secret));
    }


    //#region  Datos personales
    let datosPersonales: Record<string, unknown> | null = null;
    let edad: number = 0;
    let relacionesFamiliares: AnsesRelacionFamiliar[] = [];
    let obraSocial: Record<string, unknown> | null = null;

    const datosPersonalesObj = getLatestRegistroByTipoAndDatosRef(registros, AnsesTipoLog.DatosPersonales);
    if (datosPersonalesObj) {
      if (datosPersonalesObj.version == 1) {
        datosPersonales = asObject(parseAnsesDatos(datosPersonalesObj.datos));
        if (datosPersonales) {
          obraSocial = asObject(datosPersonales.obraSocial ?? null);
          edad = calculateAge(asString(datosPersonales.fechaNacimiento));
          const relacionesArray = asArray(datosPersonales.relaciones ?? []);

          if (relacionesArray.length > 0) {
            let i = 0;
            for (const relacion of relacionesArray) {
              const relacionObj = asObject(relacion);
              if (!relacionObj) continue;

              relacionesFamiliares.push({
                id: i.toString(),
                tipo: toTitleCase(asString(relacionObj?.relacion)),
                nombre: asString(relacionObj?.nombre),
                cuil: asString(relacionObj?.cuil) ?? "",
                fecha: asString(relacionObj?.inicioRelacion) ?? "",
              });

              i++;
            }
          }
        }
      }
      else
        throw new Error("Error al parsear datos personales. Versión desconocida. " + datosPersonalesObj.version);
    }
    //#endregion

    //#region Domicilio y contacto
    let domicilio: string = "";
    let telefono: string = "";
    let email: string = "";
    const domiciliosObj = getLatestRegistroByTipoAndDatosRef(registros, AnsesTipoLog.Domicilios);
    if (domiciliosObj) {
      if (domiciliosObj.version == 1) {
        let aux = asObject(parseAnsesDatos(domiciliosObj.datos));
        if (aux) {
          let domObj = asObject(aux.domicilio);
          if (domObj) {
            domicilio = asString(domObj.calle ?? "") + " " + asString(domObj.numero ?? "");
            if (asString(domObj.piso ?? "") !== "") {
              domicilio += ", Piso " + asString(domObj.piso ?? "");
            }
            if (asString(domObj.departamento ?? "") !== "") {
              domicilio += ", Dpto. " + asString(domObj.departamento ?? "");
            }
            if (asString(domObj.barrio ?? "") !== "") {
              domicilio += ", Barrio " + asString(domObj.barrio ?? "");
            }

            if (asString(domObj.localidad ?? "") == "CIUDAD AUTONOMA BUENOS AIRES")
              domicilio += ", CABA"
            else
              domicilio += ", " + asString(domObj.localidad_nombre ?? "");

            domicilio += " (" + asString(domObj.cpa ?? "") + ")";
          }

          let contObj = asObject(aux.contacto);
          if (contObj) {
            telefono = "+" + asString(contObj.codigoPais ?? "") + " " + asString(contObj.codigoArea ?? "") + " " + asString(contObj.numero ?? "");
            email = asString(contObj.email ?? "").toLowerCase().trim();
          }
        }
      }
      else
        throw new Error("Error al parsear domicilio y contacto. Versión desconocida. " + domiciliosObj.version);
    }
    //#endregion

    //#region Historia laboral
    let historiaLaboral: AnsesHistoriaLaboralRow[] = [];
    const historiaLaboralObj = getLatestRegistroByTipoAndDatosRef(registros, AnsesTipoLog.HistoriaLaboral);
    if (historiaLaboralObj) {
      if (historiaLaboralObj.version == 1) {
        const historiaLaboralArray = asArray(parseAnsesDatos(historiaLaboralObj.datos));

        if (historiaLaboralArray.length > 0) {
          for (const historiaLaboralItem of historiaLaboralArray) {
            const historiaLaboralItemObj = asObject(historiaLaboralItem);
            if (!historiaLaboralItemObj) continue;

            historiaLaboral.push({
              razonSocial: asString(historiaLaboralItemObj.razonSocial ?? ""),
              cuit: asString(historiaLaboralItemObj.cuit ?? ""),
              desde: asString(historiaLaboralItemObj.desde ?? ""),
              hasta: asString(historiaLaboralItemObj.hasta ?? ""),
            });
          }

          historiaLaboral.sort((a, b) => compareMesAnioDesc(a.hasta, b.hasta));
        }
      }
      else
        throw new Error("Error al parsear historia laboral. Versión desconocida. " + historiaLaboralObj.version);
    }
    //#endregion

    //#region Expedientes
    let expedientesAnses: AnsesExpedienteVinculado[] = [];
    let expedientesAnsesCerrados: AnsesExpedienteVinculado[] = [];
    const expedientesRow = getLatestRegistroByTipoAndDatosRef(registros, AnsesTipoLog.Expedientes);
    if (expedientesRow) {
      if (expedientesRow.version == 1) {
        const expedientesObj = asObject(parseAnsesDatos(expedientesRow.datos));

        if (expedientesObj) {
          const expedientesEnCurso = asArray(expedientesObj.expedientesEnCurso ?? []);

          if (expedientesEnCurso.length > 0) {
            for (const expediente of expedientesEnCurso) {
              const expedienteObj = asObject(expediente);
              if (!expedienteObj) continue;

              let estado: AnsesBadgeStatus = { label: "", variant: "neutral" };
              let timelineArray = asArray(expedienteObj.timeline ?? []);
              if (timelineArray.length > 0) {
                let fecha = "";
                let estadotxt = "";
                let variant: BadgeVariant = "neutral";

                let aux = asObject(timelineArray[0]);
                if (aux) {
                  fecha = asBoolean(aux.completo) ?? false ? asString(aux.fecha ?? "") : "";
                  estadotxt = "Iniciado" //asString(aux.estado ?? "");
                  variant = "info";
                }

                aux = asObject(timelineArray[1]);
                if (aux && (asBoolean(aux.completo) ?? false)) {
                  estadotxt = "En proceso"//asString(aux.estado ?? "");
                  variant = "info";
                }

                aux = asObject(timelineArray[2]);
                if (aux && (asBoolean(aux.completo) ?? false)) {
                  fecha = asBoolean(aux.completo) ?? false ? asString(aux.fecha ?? "") : fecha;
                  estadotxt = "Finalizado" //asString(aux.estado ?? "");
                  variant = "success";
                }

                estado = { label: estadotxt, variant: variant };
              }


              expedientesAnses.push({
                id: asString(expedienteObj.expediente ?? ""),
                numero: asString(expedienteObj.expediente ?? ""),
                tramite: asString(expedienteObj.tramite ?? ""),
                estado: estado,
                expedienteJurilexiaId: asString(expedienteObj.expediente ?? ""),
                tooltip: asString(expedienteObj.mensaje ?? ""),
                ...mapExpedienteArchivoFields(trimmed, expedienteObj),
              });
            }
          }

          const expedientesCerrados = asArray(expedientesObj.expedientesCerrados ?? []);
          if (expedientesCerrados.length > 0) {
            for (const expediente of expedientesCerrados) {
              const expedienteObj = asObject(expediente);
              if (!expedienteObj) continue;

              let fecha = asString(expedienteObj.fechaResolucion ?? "").replace(/\./g, "/");

              let estado: AnsesBadgeStatus = { label: "", variant: "neutral" };
              if (asString(expedienteObj.estado ?? "") === "favorable")
                estado = { label: "Favorable (" + fecha + ")", variant: "success" };
              else if (asString(expedienteObj.estado ?? "") === "desfavorable")
                estado = { label: "Desfavorable (" + fecha + ")", variant: "danger" };
              else
                estado = { label: "Finalizado (" + fecha + ")", variant: "neutral" };

              let tooltip = asString(expedienteObj.mensaje ?? "");
              if (tooltip.trim() !== "" && asString(expedienteObj.mensajeResolucion ?? "").trim() !== "")
                tooltip += "<br/>" + asString(expedienteObj.mensajeResolucion ?? "").trim();

              expedientesAnsesCerrados.push({
                id: asString(expedienteObj.expediente ?? ""),
                numero: asString(expedienteObj.expediente ?? ""),
                tramite: asString(expedienteObj.tramite ?? ""),
                estado: estado,
                expedienteJurilexiaId: asString(expedienteObj.expediente ?? ""),
                tooltip: tooltip,
                ...mapExpedienteArchivoFields(trimmed, expedienteObj),
              });
            }
          }
        }
      }
      else
        throw new Error("Error al parsear expedientes. Versión desconocida. " + expedientesRow.version);
    }
    //#endregion

    //#region Recibos
    const recibosRow = getRegistrosByTipoAndDatosRef(
      registros,
      AnsesTipoLog.LiquidacionPrevisional,
    )?.sort((a, b) => (b.datos_ref ?? "").localeCompare(a.datos_ref ?? ""));

    const recBeneficios: AnsesSelectOption[] = [];
    const recPeriodos: AnsesSelectOption[] = [];
    const recibosItems: AnsesReciboDetalle[] = [];

    if (recibosRow && recibosRow.length > 0) {
      for (const recibo of recibosRow) {
        if (recibo.version == 1) { //Nunca se llegó a implementar en producción
          continue;
        }
        else if (recibo.version == 2) {
          const reciboObj = asObject(parseAnsesDatos(recibo.datos));
          if (!reciboObj) continue;

          if (!recBeneficios.some((b) => b.value === reciboObj.tipoBeneficio + "-" + reciboObj.numeroBeneficio))
            recBeneficios.push({
              value: reciboObj.tipoBeneficio + "-" + reciboObj.numeroBeneficio,
              label: reciboObj.tipoBeneficio + " - " + reciboObj.numeroBeneficio
            });

          let periodoRaw = asString(recibo.datos_ref ?? "");
          if (!periodoRaw) continue;
          periodoRaw = periodoRaw.substring(periodoRaw.indexOf("-") + 1);

          const beneficioId = asString(reciboObj.tipoBeneficio ?? "") + "-" + asString(reciboObj.numeroBeneficio ?? "");
          const periodoId = `${beneficioId}-${periodoRaw}`;

          recibosItems.push(mapReciboDetalle(beneficioId, periodoId, reciboObj));

          if (!recPeriodos.some((p) => p.value === periodoId)) {
            recPeriodos.push({ value: periodoId, label: formatPeriodo(periodoRaw) });
          }
        }
        else
          throw new Error("Error al parsear recibos. Versión desconocida. " + recibo.version);

      }
    }

    const selectedBeneficio = recBeneficios[0]?.value ?? "";
    const selectedRecibo =
      recPeriodos.find((periodo) => periodo.value.startsWith(`${selectedBeneficio}-`))?.value ??
      recPeriodos[0]?.value ??
      "";
    //#endregion


    //#region Beneficios
    let beneficios: AnsesBeneficio[] = [];
    if (recibosRow && recibosRow.length > 0) {
      for (const recibo of recibosRow) {
        if (recibo.version == 1) { //Nunca se llegó a implementar en producción
          continue;
        }
        else if (recibo.version == 2) {
          const reciboObj = asObject(parseAnsesDatos(recibo.datos));
          if (!reciboObj) continue;

          const beneficioObj = asObject(reciboObj.beneficio ?? null);
          if (beneficioObj) {
            const id = asString(beneficioObj.id ?? beneficioObj.beneficio ?? "");
            if (!id || beneficios.some((b) => b.id === id)) continue;

            let estado: AnsesBadgeStatus = { label: "", variant: "neutral" };
            const fechaBaja = asString(beneficioObj.fechaBaja ?? "").trim();
            if (fechaBaja === "" || fechaBaja === "-") {
              estado = { label: "Activo", variant: "success" };
            } else {
              estado = { label: "Inactivo (" + fechaBaja + ")", variant: "danger" };
            }

            beneficios.push({
              id,
              numero: asString(beneficioObj.beneficio ?? id),
              descripcion: asString(beneficioObj.leyAplicada ?? ""),
              estado,
            });
            continue;
          }

          const numeroBeneficio = asString(reciboObj.numeroBeneficio ?? "");
          if (!numeroBeneficio || beneficios.some((b) => b.id === numeroBeneficio)) continue;

          beneficios.push({
            id: numeroBeneficio,
            numero: numeroBeneficio,
            descripcion: asString(reciboObj.tipoBeneficio ?? ""),
            estado: { label: "Activo", variant: "success" },
          });
        }
      }
    }
    //#endregion

    const personaNombre = displayPersonaNombre(persona);
    const clienteNombre =
      asString(datosPersonales?.apellidoNombre ?? "") || personaNombre;
    const clienteDni =
      asString(datosPersonales?.documento ?? "") || (persona.documento ?? "");
    const clienteCuil =
      asString(datosPersonales?.cuil ?? "") || (persona.cuil ?? "");

    return {
      personaId,
      cliente: {
        id: trimmed,
        nombre: clienteNombre,
        iniciales: getInitials(clienteNombre),
        tienePassword: tienePassword,
        estadoPassword: EstadoPassword,
        passwordAnterior: passwordAnterior,
        dni: clienteDni,
        cuil: clienteCuil,
        fechaNacimiento: asString(datosPersonales?.fechaNacimiento ?? ""),
        edad: edad,
        nacionalidad: asString(datosPersonales?.nacionalidad ?? ""),
        estadoCivil: asString(datosPersonales?.estadoCivil ?? ""),
        chipLabel: clienteDni
          ? `${clienteNombre} - DNI ${clienteDni}`
          : clienteNombre,
      },
      sincronizacion: {
        ultima: ultimaSincronizacion,
        estado: estadoSincronizacionBadge,
        activa: personaPrevisional?.sincronizar_anses === 1,
      },
      links: {
        verEnCliente: `/clientes/${trimmed}`,
      },
      informacionPersonal: {
        campos: [
          { label: "Domicilio", value: domicilio },
          { label: "Teléfono", value: telefono },
          { label: "Email", value: email },
          { label: "Obra social", value: asString(obraSocial?.nombre ?? "") + (asString(obraSocial?.tipo ?? "") !== "" ? " (" + asString(obraSocial?.tipo ?? "") + ")" : "") },
        ],
      },
      relacionesFamiliares: {
        items: relacionesFamiliares
      },
      beneficios: {
        items: beneficios
      },
      expedientesVinculados: {
        total: expedientesAnses.length + expedientesAnsesCerrados.length,
        items: expedientesAnses,
        itemsCerrados: expedientesAnsesCerrados,
      },
      historiaLaboral: {
        filas: historiaLaboral,
      },
      recibos: {
        beneficios: recBeneficios,
        periodos: recPeriodos,
        beneficioSeleccionado: selectedBeneficio,
        periodoSeleccionado: selectedRecibo,
        items: recibosItems
      },
    };
  },
};


function mapExpedienteArchivoFields(
  clienteId: string,
  expedienteObj: Record<string, unknown>,
): Pick<AnsesExpedienteVinculado, "tieneArchivo" | "archivoUrl" | "archivoNombre"> {
  const expedienteNumero = asString(expedienteObj.expediente ?? "");
  const tieneArchivo = asBoolean(expedienteObj.tieneArchivo ?? false);

  if (!tieneArchivo || !expedienteNumero) {
    return { tieneArchivo: false };
  }

  const archivoNombre =
    asString(expedienteObj.nombreArchivo ?? expedienteObj.archivoNombre ?? "") ||
    `Expediente-${expedienteNumero}.pdf`;

  return {
    tieneArchivo: true,
    archivoUrl: `/api/automatizaciones/anses/${encodeURIComponent(clienteId)}/expedientes/${encodeURIComponent(expedienteNumero)}/archivo`,
    archivoNombre,
  };
}

function findExpedienteWithArchivo(
  registros: AnsesClienteRow[],
  expedienteId: string,
): Record<string, unknown> | null {
  const expedientesRow = getLatestRegistroByTipoAndDatosRef(
    registros,
    AnsesTipoLog.Expedientes
  );
  if (!expedientesRow) return null;

  const expedientesObj = asObject(parseAnsesDatos(expedientesRow.datos));
  if (!expedientesObj) return null;

  const collections = [
    ...asArray(expedientesObj.expedientesEnCurso ?? []),
    ...asArray(expedientesObj.expedientesCerrados ?? []),
  ];

  for (const item of collections) {
    const obj = asObject(item);
    if (!obj) continue;
    if (asString(obj.expediente ?? "") !== expedienteId) continue;
    if (!asBoolean(obj.tieneArchivo ?? false)) return null;
    return obj;
  }

  return null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}
function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function toTitleCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  return trimmed.replace(
    /\w\S*/g,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function displayPersonaNombre(persona: {
  tipo?: string | null;
  nombre?: string | null;
  apellido?: string | null;
}): string {
  if (persona.tipo === "juridica") {
    return (persona.nombre ?? "").trim();
  }
  return [persona.nombre, persona.apellido].filter(Boolean).join(" ").trim();
}

function getInitials(name: string, max = 2): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

async function resolveStorageClienteId(
  ctx: AnsesServiceCtx,
  clienteId: string,
): Promise<{ personaId: string, cuil: string }> {
  const trimmedClienteId = clienteId.trim();
  if (!trimmedClienteId) {
    throw new Error("Parámetros requeridos");
  }

  //Esto lo hace para ver si el cliente existe y pertenece al tenant, sinó da error
  return await resolveClientePersonaId(ctx, trimmedClienteId);
}

async function resolveClientePersonaId(
  ctx: AnsesServiceCtx,
  clienteId: string,
): Promise<{ personaId: string, cuil: string }> {
  const trimmedClienteId = clienteId.trim();
  if (!trimmedClienteId) {
    throw new Error("Parámetros requeridos");
  }

  const cliente = await clienteRepository.getPersonaId(
    ctx,
    trimmedClienteId,
  );
  if (!cliente?.persona_id) throw new Error("Cliente no encontrado");

  const persona = asObject(cliente.persona ?? null);
  if (!persona) throw new Error("Persona no encontrada");
  return { personaId: asString(persona.persona_id ?? ""), cuil: asString(persona.cuil ?? persona.cuit ?? "") };
}

async function downloadAnsesStorageFile(
  storagePath: string,
  filename: string,
): Promise<AnsesArchivoFile> {
  try {
    const file = await ansesStorage.getFile(storagePath);
    return {
      filename,
      content: file.content,
      contentType: file.contentType || "application/pdf",
    };
  } catch (error) {
    if (error instanceof StorageObjectNotFoundError) {
      throw new Error("Archivo no encontrado");
    }
    throw error;
  }
}

async function getReciboHaberesArchivo(
  ctx: AnsesServiceCtx,
  clienteId: string,
  beneficioId: string,
  periodoId: string,
  kind: ReciboHaberesArchivoKind,
): Promise<AnsesArchivoFile> {
  const trimmedBeneficio = beneficioId.trim();
  const trimmedPeriodo = periodoId.trim();
  if (!trimmedBeneficio || !trimmedPeriodo) {
    throw new Error("Parámetros requeridos");
  }
  if (!/^\d{4}-\d{2}$/.test(trimmedPeriodo)) {
    throw new Error("Período inválido");
  }
  //Esto lo hace para ver si el cliente existe y pertenece al tenant, sinó da error
  const { cuil, personaId } = await resolveStorageClienteId(ctx, clienteId);
  const filename = RECIBO_HABERES_FILES[kind];
  const storagePath = `${clienteId}/Haberes/${trimmedPeriodo}/${filename}`;

  const filenameToClient = RECIBO_HABERES_FILES_TOCLIENT[kind]
    .replace("{0}", cuil)
    .replace("{1}", trimmedPeriodo.replace("-", ""));
  return downloadAnsesStorageFile(storagePath, filenameToClient);
}

function mapReciboDetalle(
  beneficioId: string,
  periodoId: string,
  reciboObj: Record<string, unknown>,
): AnsesReciboDetalle {
  const liquidacionObj = asObject(reciboObj.liquidacion ?? null);
  const conceptosObj = asArray(reciboObj.conceptos ?? liquidacionObj?.conceptos ?? []);

  const subtotalHaberes = reciboObj.subtotalHaberes ?? liquidacionObj?.subtotalHaberes;
  const subtotalDeducciones = reciboObj.subtotalDeducciones ?? liquidacionObj?.subtotalDeducciones;
  const totalACobrar =
    reciboObj.totalACobrar ?? liquidacionObj?.totalACobrar ?? liquidacionObj?.neto;

  let haberBruto: string;
  let descuentos: string;
  let haberNeto: string;

  if (subtotalHaberes != null || subtotalDeducciones != null || totalACobrar != null) {
    haberBruto = formatReciboMonto(subtotalHaberes ?? 0);
    descuentos = formatReciboMonto(subtotalDeducciones ?? 0);
    haberNeto = formatReciboMonto(totalACobrar ?? 0);
  } else {
    let bruto = 0;
    let desc = 0;

    for (const concepto of conceptosObj ?? []) {
      const conceptoObj = asObject(concepto);
      if (!conceptoObj) continue;
      if (conceptoObj.haberes) {
        bruto += parseReciboMontoNumber(conceptoObj.haberes);
      }
      if (conceptoObj.deducciones) {
        desc += parseReciboMontoNumber(conceptoObj.deducciones);
      }
    }

    haberBruto = formatReciboMonto(bruto);
    descuentos = formatReciboMonto(desc);
    haberNeto = formatReciboMonto(bruto - desc);
  }

  const fechaRaw = asString(
    reciboObj.fechaLiquidacion ?? liquidacionObj?.fechaLiquidacion ?? "",
  );
  const fechaPago = formatFechaLocal(fechaRaw);

  return {
    beneficioId,
    periodoId,
    haberBruto,
    descuentos,
    haberNeto,
    fechaPago,
  };
}


function parseReciboMontoNumber(value: unknown): number {
  const text = asString(value).trim();
  if (!text) return 0;

  const normalized = text
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatReciboMonto(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `$ ${currencyFormatter.display(value)}`;
  }

  const text = asString(value).trim();
  if (!text) return "—";
  return text.startsWith("$") ? text : `$ ${text}`;
}

/** Convierte `YYYY-MM` → "Abril 2026". Si el formato es inválido, devuelve el valor original. */
function formatPeriodo(datosRef: string): string {
  const trimmed = datosRef.trim();
  if (!trimmed) return "";

  const [year, month] = trimmed.split("-");
  const monthIndex = Number.parseInt(month ?? "", 10) - 1;
  if (!year || monthIndex < 0 || monthIndex > 11) return trimmed;

  return `${MESES[monthIndex]} ${year}`;
}

/** Convierte MM/YYYY a clave ordenable (año*12 + mes). */
function parseMesAnio(value: string): number | null {
  const trimmed = value.trim();
  const match = /^(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!match) return null;

  const month = Number(match[1]);
  const year = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return year * 12 + month;
}

/** Orden descendente por MM/YYYY; vacíos/inválidos al inicio (período vigente). */
function compareMesAnioDesc(a: string, b: string): number {
  const aKey = parseMesAnio(a);
  const bKey = parseMesAnio(b);

  if (aKey === null && bKey === null) return 0;
  if (aKey === null) return -1;
  if (bKey === null) return 1;

  return bKey - aKey;
}

function calculateAge(fechaNacimiento: string): number {
  const trimmed = fechaNacimiento.trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) return 0;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const birth = new Date(year, month - 1, day);
  // Valida que la fecha sea real (ej. no 31/02/1943)
  if (
    birth.getFullYear() !== year ||
    birth.getMonth() !== month - 1 ||
    birth.getDate() !== day
  ) {
    return 0;
  }
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}