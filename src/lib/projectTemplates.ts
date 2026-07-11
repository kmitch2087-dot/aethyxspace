// Project type templates — defines the default phase breakdown for each kind of
// engagement Aethyx runs. To add a new project type later (e.g. "SEO", "Social Media
// Management"), just add a new entry to PROJECT_TYPES below. No schema change needed.

export type ProjectTypeKey = "website_build" | "google_ads";

export interface PhaseTemplate {
  name: string;
  description?: string;
}

export interface ProjectTypeTemplate {
  key: ProjectTypeKey;
  label: string;
  /** Default name shown in "Create Project Plan" dialog when this type is selected. */
  defaultProjectName: string;
  /**
   * Whether this project type is driven by the client_document_slots checklist
   * (Site Audit / Market Research / Service Tier / Plan / Agreement) with slot uploads
   * auto-completing matching phases. Only ever true for one type at a time per client —
   * uploading into those slots targets whichever of the client's plans has
   * usesDocumentSlots === true.
   */
  usesDocumentSlots: boolean;
  defaultPhases: PhaseTemplate[];
}

export const PROJECT_TYPES: ProjectTypeTemplate[] = [
  {
    key: "website_build",
    label: "Website Build",
    defaultProjectName: "Website Project",
    usesDocumentSlots: true,
    defaultPhases: [
      { name: "Site Audit" },
      { name: "Market Research" },
      { name: "Service Tier" },
      { name: "Project Planning" },
      { name: "Contract & Agreement" },
    ],
  },
  {
    key: "google_ads",
    label: "Google Ads Management",
    defaultProjectName: "Google Ads Management",
    usesDocumentSlots: false,
    defaultPhases: [
      {
        name: "Week 1: Access, Setup + Strategy",
        description:
          "Review website/booking flow, Google Business Profile listings, service area & pricing. Set up/access Google Ads, GA4, GTM. Confirm campaign goal. Build initial keyword + negative keyword lists.",
      },
      {
        name: "Week 2: Campaign Buildout",
        description:
          "Build Google Search Ads campaign, set local radius targeting, write ad copy for high-intent searches, add call assets/sitelinks, connect booking path, set up conversion tracking, review before launch.",
      },
      {
        name: "Weeks 3-4: Launch + Early Monitoring",
        description:
          "Launch campaign, monitor spend/search activity, add negative keywords as needed, review which keywords get clicks and early CPC, review booking/call activity, make early adjustments.",
      },
      {
        name: "Month 2: Optimization",
        description:
          "Review search terms and remove poor-fit traffic, adjust keywords/ad copy, review which services drive interest, check call/booking clicks, review location performance, adjust budget focus, continue weekly check-ins.",
      },
      {
        name: "Month 3: Performance Review + Next-Step Plan",
        description:
          "Review full 90-day performance, identify strongest/weakest keywords, review CPC/cost-per-lead, recommend continue/adjust/increase budget/pause, deliver clear next-step recommendation.",
      },
    ],
  },
];

export const getProjectTypeTemplate = (key: string): ProjectTypeTemplate =>
  PROJECT_TYPES.find((t) => t.key === key) || PROJECT_TYPES[0];

export const DEFAULT_PROJECT_TYPE: ProjectTypeKey = "website_build";
