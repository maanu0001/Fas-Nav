import { createOrgCollectionRoutes } from "@/lib/org-collection-route";
import { programItemSchema } from "@/lib/validation/schemas";


const routes = createOrgCollectionRoutes({
  entity: "ProgramItem",
  action: "program_item",
  delegate: (client) => client.programItem,
  schema: programItemSchema,

});

export const dynamic = "force-dynamic";
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
