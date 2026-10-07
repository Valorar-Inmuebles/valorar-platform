// Local-only HTTP double for browser UAT of the real Next Server Action/RSC flow.
// Usage: node scripts/property-write-uat.mjs <Admin harness report.json>
// Start Admin separately with API_URL=http://127.0.0.1:3099 on port 3101.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import process from "node:process";
import { evaluateListingPublishability } from "@repo/property-rules";

const fixture = JSON.parse(readFileSync(process.argv[2], "utf8"))[3].initial;
let property = structuredClone(fixture);
const trace = [];
const features = ["cochera-fija", "cochera-cubierta", "pileta"].map(
  (slug, index) => ({
    id: `feature-${index}`,
    slug,
    name: slug,
    category: "GENERAL",
    isActive: true,
    sortOrder: index,
    createdAt: fixture.createdAt,
    updatedAt: fixture.updatedAt,
  }),
);
let assignments = [features[0], features[2]].map((feature) => ({
  ...feature,
  featureId: feature.id,
  value: feature.slug === "pileta" ? "Compartida" : null,
}));
const user = {
  id: "user-1",
  tenantId: "tenant-1",
  role: "TENANT_ADMIN",
  name: "Fixture Admin",
  email: "fixture@example.test",
  isActive: true,
  permissions: [],
};
const listing = {
  id: "listing-1",
  propertyId: fixture.id,
  tenantId: fixture.tenantId,
  listingType: "SALE",
  status: "ACTIVE",
  isFeatured: false,
  expensesAmount: null,
  expensesCurrency: null,
};
const prices = [
  {
    id: "price-1",
    listingId: listing.id,
    tenantId: fixture.tenantId,
    isPrimary: true,
    amount: 10000,
    currency: "USD",
  },
];
const send = (response, body, status = 200) => {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
};

createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:3099");
  const path = url.pathname;
  if (path === "/__reset") {
    property = structuredClone(fixture);
    assignments = [features[0], features[2]].map((feature) => ({
      ...feature,
      featureId: feature.id,
      value: feature.slug === "pileta" ? "Compartida" : null,
    }));
    trace.length = 0;
    send(response, {});
    return;
  }
  if (path === "/session") {
    response.writeHead(302, {
      "Set-Cookie":
        "access_token=p12-local-fixture; Path=/; HttpOnly; SameSite=Lax",
      Location: "http://localhost:3101/propiedades/property-1",
    });
    response.end();
    return;
  }
  if (path === "/__trace") {
    send(response, trace);
    return;
  }
  if (path === "/__clear-trace") {
    trace.length = 0;
    send(response, {});
    return;
  }
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  const body = raw ? JSON.parse(raw) : null;
  trace.push({ method: request.method, path, body });
  if (path === "/auth/me") {
    send(response, user);
    return;
  }
  if (path === "/users") {
    send(response, [user]);
    return;
  }
  if (path === "/property-features") {
    send(response, features);
    return;
  }
  if (path === "/properties/property-1/features") {
    if (request.method === "PUT")
      assignments = body.features.map((item) => ({
        ...features.find((feature) => feature.id === item.featureId),
        ...item,
        value: item.value ?? null,
      }));
    send(response, assignments);
    return;
  }
  if (path === "/properties/property-1" && request.method === "PATCH") {
    property = { ...property, ...body, updatedAt: new Date().toISOString() };
    send(response, property);
    return;
  }
  if (path === "/properties/property-1/detail-context") {
    send(response, {
      property,
      operations: [
        {
          listing,
          prices,
          publishability: evaluateListingPublishability({
            propertyIsActive: property.isActive,
            imageCount: 1,
            hasCoverImage: true,
            listingStatus: "ACTIVE",
            hasPrimaryPrice: true,
          }),
        },
      ],
      imageCount: 1,
      hasCoverImage: true,
      featureCount: assignments.length,
    });
    return;
  }
  if (path === "/properties") {
    send(response, [property]);
    return;
  }
  if (path === "/property-listings") {
    send(response, [listing]);
    return;
  }
  if (path === "/properties/publishability-summary") {
    send(response, []);
    return;
  }
  if (path === "/geo/provinces") {
    send(response, [{ id: "province-1", name: "Province" }]);
    return;
  }
  if (path.includes("/neighborhoods")) {
    send(response, [{ id: "neighborhood-1", name: "Neighborhood" }]);
    return;
  }
  if (path.includes("/localities")) {
    send(response, [
      { id: "locality-1", name: "City", provinceId: "province-1" },
    ]);
    return;
  }
  send(response, { message: `Unhandled fixture path: ${path}` }, 404);
}).listen(3099, "127.0.0.1", () =>
  console.info("P1.2 fixture API: http://127.0.0.1:3099/session (memory only)"),
);
