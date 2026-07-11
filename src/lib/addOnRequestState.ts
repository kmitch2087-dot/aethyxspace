export type AddOnRequestState = "active" | "requested" | "requestable";

interface ClientAddOnRow {
  add_on_catalog_id: string | null;
  status: string;
}

export function computeAddOnRequestState(
  clientAddOns: ClientAddOnRow[],
  catalogId: string
): AddOnRequestState {
  const rows = clientAddOns.filter((row) => row.add_on_catalog_id === catalogId);
  if (rows.some((row) => row.status === "active")) return "active";
  if (rows.some((row) => row.status === "requested")) return "requested";
  return "requestable";
}
