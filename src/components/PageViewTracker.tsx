import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { shouldTrackPath, getSessionId, getExternalReferrer } from "@/lib/pageTracking";

const PageViewTracker = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!shouldTrackPath(pathname)) return;
    supabase
      .from("page_views" as any)
      .insert({
        path: pathname.slice(0, 300),
        referrer: getExternalReferrer(),
        session_id: getSessionId(),
        device: window.innerWidth < 768 ? "mobile" : "desktop",
      } as any)
      .then(() => {});
  }, [pathname]);

  return null;
};

export default PageViewTracker;
