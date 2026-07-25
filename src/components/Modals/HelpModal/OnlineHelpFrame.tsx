import styles from "@/app/page.module.css";

import { HELP_SITE_URL } from "./help-site-availability";

export default function OnlineHelpFrame() {
  return (
    <iframe
      className={styles.helpSiteFrame}
      src={HELP_SITE_URL}
      title="HeroQuest Card Creator online help"
    />
  );
}
