import { createOrgCollectionRoutes } from "@/lib/org-collection-route";
import { sponsorSchema } from "@/lib/validation/schemas";
import { FEATURE_KEYS } from "@/lib/constants";

const routes = createOrgCollectionRoutes({
  entity: "Sponsor",
  action: "sponsor",
  delegate: (client) => client.sponsor,
  schema: sponsorSchema,
  featureKey: FEATURE_KEYS.SPONSORS,
});

export const dynamic = "force-dynamic";
export const POST = routes.POST;
