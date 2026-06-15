import {
  ansesClienteRepository,
  type AnsesClienteRow,
} from "@/BBDD/repositories/anses-cliente.repository";
import {
  crucesWinCarRepository,
  type CruceWinCarRow,
} from "@/BBDD/repositories/cruces-wincar.repository";
import { clienteService } from "@/lib/server/services/cliente.service";
import type {
  AnsesCruceRow,
  AnsesCrucesPageDto,
  ClienteSentencia,
} from "@/lib/types/anses-cruces";
import type { ClienteWithPrevisionalDto } from "./cliente.service";
import { formatDisplayDateTime } from "@/lib/datetime/format-display-datetime";
import {
  ansesStorage,
  StorageObjectNotFoundError,
} from "@/lib/server/storage";
import type { ServerContext } from "@/lib/server/context/types";

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

const CRUCES_CLIENTE_ID = "00000000-0000-0000-0000-000000000000";
const CRUCES_TIPO = "SENTENCIAS";

type CrucesDbCtx = Pick<ServerContext, "tenant_id" | "is_superadmin">;

function latestPerDatosRef(rows: AnsesClienteRow[]): AnsesClienteRow[] {
  const byRef = new Map<string, AnsesClienteRow>();

  for (const row of rows) {
    const ref = row.datos_ref?.trim();
    if (!ref) continue;

    const existing = byRef.get(ref);
    if (!existing || row.created_at > existing.created_at) {
      byRef.set(ref, row);
    }
  }

  return Array.from(byRef.values()).sort((a, b) =>
    (b.datos_ref ?? "").localeCompare(a.datos_ref ?? ""),
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string" && value.length > 0) {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

/** "2026-04" → "202604" (segmento de URL) */
function toPeriodoSlug(datosRef: string): string {
  return datosRef.replace(/-/g, "");
}

function parseClientesSentencias(raw: string): ClienteSentencia[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Formato de sentencias inválido");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Formato de sentencias inválido");
  }

  return parsed.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Formato de sentencias inválido");
    }
    const row = item as Record<string, unknown>;
    return {
      nombre: typeof row.nombre === "string" ? row.nombre : "",
      beneficio: typeof row.beneficio === "string" ? row.beneficio : "",
      detalle: typeof row.detalle === "string" ? row.detalle : "",
      mesanio: typeof row.mesanio === "string" ? row.mesanio : "",
    };
  });
}


function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function matchNombre(
  patron: string,
  nombreCompleto: string
): boolean {

  // normalizar
  const p = normalize(patron);
  const n = normalize(nombreCompleto);

  // quedarse con primeros 6
  const pattern6 = p.substring(0, 6);

  // convertir # en wildcard
  const regex =
    new RegExp(
      "^" +
      pattern6.replace(/#/g, ".")
    );

  return regex.test(n);
}





/** "202604" o "2026-04" → "2026-04" (datos_ref en DB) */
function toDatosRef(periodo: string): string {
  const trimmed = periodo.trim();
  if (/^\d{6}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}`;
  }
  return trimmed;
}

function formatPeriodo(datosRef: string | null): string {
  if (!datosRef) return "—";
  const [year, month] = datosRef.split("-");
  const monthIndex = Number.parseInt(month ?? "", 10) - 1;
  if (!year || monthIndex < 0 || monthIndex > 11) return datosRef;
  return `${MESES[monthIndex]} ${year}`;
}


function readNumber(datos: Record<string, unknown> | null, key: string): number {
  const value = datos?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function mapToCruceRow(row: AnsesClienteRow): AnsesCruceRow {
  const datos = asRecord(row.datos);
  const datosRef = row.datos_ref?.trim() ?? "";

  return {
    id: String(row.id),
    periodo: formatPeriodo(row.datos_ref),
    fechaEjecucion: formatDisplayDateTime(row.created_at),
    clientesProcesados: readNumber(datos, "registros"),
    estado: {
      label:
        typeof datos?.estadoLabel === "string" ? datos.estadoLabel : "Completado",
      variant:
        datos?.estadoVariant === "warning" ||
          datos?.estadoVariant === "danger" ||
          datos?.estadoVariant === "neutral"
          ? datos.estadoVariant
          : "success",
    },
    archivoNombre:
      typeof datos?.archivoNombre === "string"
        ? datos.archivoNombre
        : datosRef
          ? `cruce-${datosRef}.csv`
          : undefined,
    archivoUrl: datosRef
      ? `/api/automatizaciones/cruces/${toPeriodoSlug(datosRef)}`
      : undefined,
  };
}

export type AnsesCruceCsvFile = {
  filename: string;
  content: string;
};

/** Aca estaba la función Original, se adecuó para que use la tabla que generarmos TEMPORALMENTE con datos de WinCAR */
// function buildCruceCsvContent(
//   _clientesSentencias: ClienteSentencia[],
//   _clientesTenant: Awaited<ReturnType<typeof clienteService.getAllWithPrevisional>>,
// ): string {
//   let strRet = "";

//   const encontrados: { cliente: ClienteWithPrevisionalDto; sentencias: ClienteSentencia[] }[] = [];

//   for (const cliente of _clientesTenant) {
//     const numero = cliente.previsional?.numero_beneficio.toString().replaceAll("-", "") ?? "";
//     if (numero.length < 8)
//       continue;
//     const inicio = numero.substring(0, 3);
//     const fin = numero.slice(-5);

//     //Busco los que coinciden con el número de beneficio.
//     const candidatos = _clientesSentencias.filter(s =>
//       s.beneficio.startsWith(inicio) &&
//       s.beneficio.endsWith(fin)
//     );

//     let candidatosOk: ClienteSentencia[] = [];
//     for (const candidato of candidatos) {
//       const nombreCompleto = cliente.apellido + " " + cliente.nombre;

//       const ok =
//         matchNombre(
//           candidato.nombre,
//           nombreCompleto
//         );

//       if (ok) {
//         if (encontrados.some(e => e.cliente.id == cliente.id))
//           encontrados.find(e => e.cliente.id == cliente.id)?.sentencias.push(candidato);
//         else
//           encontrados.push({ cliente: cliente, sentencias: [candidato] });
//       }
//     }

//     for (const encontrado of encontrados) {
//       for (const sentencia of encontrado.sentencias) {
//         strRet += `${encontrado.cliente.apellido};${encontrado.cliente.nombre};${encontrado.cliente.previsional?.numero_beneficio ?? sentencia.beneficio}\n`;
//       }
//     }

//   }

//   if (strRet.length > 0) 
//     strRet = "Apellido;Nombre;Beneficio\n" + strRet;
//   else
//     strRet = "No se encontraron clientes en las sentencias.";

//   return strRet;
// }

/** Aca estaba la función Original, se adecuó para que use la tabla que generarmos TEMPORALMENTE con datos de WinCAR */
function buildCruceCsvContent_WINCAR(
  clientesSentencias: ClienteSentencia[],
  clientesWINCAR: CruceWinCarRow[],
): string {
  let strRet = "";

  const encontrados: { cliente: CruceWinCarRow; sentencias: ClienteSentencia[] }[] = [];

  for (const cliente of clientesWINCAR) {
    if (cliente.abeneficiocaja && cliente.abeneficiocaja > 0)
    {



      const candidatos = clientesSentencias.filter(s =>{
        const num = parseInt(s.beneficio.substring(0, 2));
        const tipo = parseInt(s.beneficio.substring(2, 3));
        const beneficio = parseInt(s.beneficio.substring(3, 10).replaceAll("X", ""));
        const copar = parseInt(s.beneficio.substring(10, 11));
        
        return num == cliente.abeneficiocaja && 
          tipo == cliente.atipobeneficio && 
          cliente.abeneficio?.toString().endsWith(beneficio.toString()) && 
          copar == cliente.abeneficiocopar &&
          matchNombre(s.nombre, cliente.cliente ?? "");
      });

      for (const candidato of candidatos) {
        if (encontrados.some(e => e.cliente.cliente == cliente.cliente))
          encontrados.find(e => e.cliente.cliente == cliente.cliente)?.sentencias.push(candidato);
        else
          encontrados.push({ cliente: cliente, sentencias: [candidato] });
      }
    }
  }

  for (const encontrado of encontrados) {
    for (const sentencia of encontrado.sentencias) {
      //strRet += `${encontrado.cliente.cliente};${encontrado.cliente.previsional?.numero_beneficio ?? sentencia.beneficio}\n`;
      const beneficio = `${encontrado.cliente.abeneficiocaja?.toString()}-${encontrado.cliente.atipobeneficio?.toString()}-${encontrado.cliente.abeneficio?.toString().padStart(7, '0')}-${encontrado.cliente.abeneficiocopar?.toString()}`;
      strRet += `${encontrado.cliente.carpetaid};${encontrado.cliente.cliente};${encontrado.cliente.ccuitdocumento};${beneficio}\n`;
    }
  }

  if (strRet.length > 0) 
    strRet = "Carpeta;Cliente;Documento;Beneficio\n" + strRet;
  else
    strRet = "No se encontraron clientes en las sentencias.";

  return strRet;
}

export const ansesCrucesService = {
  async getCruces(_ctx: CrucesDbCtx): Promise<AnsesCrucesPageDto> {
    const registros = await ansesClienteRepository.getAllByClienteAndTipo(
      {},
      CRUCES_CLIENTE_ID,
      CRUCES_TIPO,
    );

    const filas = latestPerDatosRef(registros).map(mapToCruceRow);

    return {
      titulo: "Cruces ANSES",
      subtitulo:
        "Monitoreo mensual automático de novedades y cruces de información.",
      // ejecutarCruceLabel: "Ejecutar cruce ahora",
      filas,
      total: filas.length,
    };
  },

  /** Acá está el cruces Original, se adecuó para que use la tabla que generarmos TEMPORALMENTE con datos de WinCAR */
  // async getCruceCsv(ctx: CrucesDbCtx, periodo: string): Promise<AnsesCruceCsvFile> {
  //   if (ctx.tenant_id == null) {
  //     throw new Error("Tenant requerido");
  //   }

  //   const datosRef = toDatosRef(periodo);

  //   if (!/^\d{4}-\d{2}$/.test(datosRef)) {
  //     throw new Error("Período inválido");
  //   }

  //   const registros = await ansesClienteRepository.getAllByClienteAndTipo(
  //     ctx,
  //     CRUCES_CLIENTE_ID,
  //     CRUCES_TIPO,
  //   );

  //   const match = latestPerDatosRef(registros).find((r) => r.datos_ref?.trim() === datosRef);
  //   if (!match) {
  //     throw new Error("Cruce no encontrado");
  //   }

  //   const storagePath = `sentencias/${datosRef}.json`;
  //   let rawJson: string;
  //   try {
  //     rawJson = await ansesStorage.getText(storagePath);
  //   } catch (error) {
  //     if (error instanceof StorageObjectNotFoundError) {
  //       throw new Error("Archivo no encontrado");
  //     }
  //     throw error;
  //   }

  //   const clientesSentencias = parseClientesSentencias(rawJson);

  //   const clientesTenant = await clienteService.getAllWithPrevisional(ctx);

  //   const content = buildCruceCsvContent(clientesSentencias, clientesTenant);

  //   return {
  //     filename: `cruce-${datosRef}.csv`,
  //     content,
  //   };
  // },



  /** Acá esta el cruces para la tabla temporal que generamos con datos de WinCAR */
  async getCruceCsv(ctx: CrucesDbCtx, periodo: string): Promise<AnsesCruceCsvFile> {
    if (ctx.tenant_id == null) {
      throw new Error("Tenant requerido");
    }

    const datosRef = toDatosRef(periodo);

    if (!/^\d{4}-\d{2}$/.test(datosRef)) {
      throw new Error("Período inválido");
    }

    const storagePath = `sentencias/${datosRef}.json`;
    let rawJson: string;
    try {
      rawJson = await ansesStorage.getText(storagePath);
    } catch (error) {
      if (error instanceof StorageObjectNotFoundError) {
        throw new Error("Archivo no encontrado");
      }
      throw error;
    }

    const crucesWinCar: CruceWinCarRow[] =
      await crucesWinCarRepository.getAll(ctx);

    const clientesSentencias = parseClientesSentencias(rawJson);

    const content = buildCruceCsvContent_WINCAR(clientesSentencias, crucesWinCar);

    return {
      filename: `cruce-${datosRef}.csv`,
      content,
    };
  },
};




