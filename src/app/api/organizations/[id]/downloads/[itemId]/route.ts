import { createOrgCollectionRoutes } from "@/lib/org-collection-route";
import { downloadSchema } from "@/lib/validation/schemas";


const routes = createOrgCollectionRoutes({
  entity: "Download",
  action: "download",
  delegate: (client) => client.download,
  schema: downloadSchema,

});

export const dynamic = "force-dynamic";
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
