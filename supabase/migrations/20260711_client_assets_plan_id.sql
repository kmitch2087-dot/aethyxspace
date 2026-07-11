-- Assets (logos, brand voice, taglines, brand files) become scoped to a specific
-- project/business instead of one shared pool per client login — needed for any
-- client running multiple distinct businesses under one portal login (confirmed:
-- Irving Munoz has both a Website Project and a separate Limitless Barbershop
-- Google Ads project).
ALTER TABLE client_assets ADD COLUMN plan_id uuid REFERENCES client_project_plans(id) ON DELETE SET NULL;

-- Backfill: only for clients with exactly one project plan, where the assignment
-- is unambiguous. Clients with multiple plans (as of this migration: only Irving
-- Munoz) are deliberately left NULL rather than guessed at — reassigned manually
-- via the new "Unassigned" section in ClientDetail.tsx's Assets tab.
UPDATE client_assets ca
SET plan_id = (
  SELECT id FROM client_project_plans cpp
  WHERE cpp.client_profile_id = ca.client_profile_id
)
WHERE ca.client_profile_id IN (
  SELECT client_profile_id FROM client_project_plans
  GROUP BY client_profile_id
  HAVING count(*) = 1
);
