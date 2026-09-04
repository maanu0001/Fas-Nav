import { createOrgCollectionRoutes } from "@/lib/org-collection-route";
import { faqSchema } from "@/lib/validation/schemas";


const routes = createOrgCollectionRoutes({
  entity: "Faq",
  action: "faq",
  delegate: (client) => client.faq,
  schema: faqSchema,

});

export const dynamic = "force-dynamic";
export const POST = routes.POST;
