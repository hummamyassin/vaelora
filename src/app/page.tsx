import { PlannerApp } from "../components/planner-app";
import { activityAreas } from "../data/activity-areas";
import { v1WeatherPolicy } from "../server/recommendations/policy";

export default function Home() {
  const policy = {
    running: { maxPreferredWind: v1WeatherPolicy.activities.running.windKmh.preferred[1], maxPreferredHeat: v1WeatherPolicy.activities.running.temperatureC.preferred[1] },
    walking: { maxPreferredWind: v1WeatherPolicy.activities.walking.windKmh.preferred[1], maxPreferredHeat: v1WeatherPolicy.activities.walking.temperatureC.preferred[1] },
  };
  const areas = activityAreas.filter(area => area.verificationStatus !== "unverified").map(area => ({ ...area, verificationStatus: area.verificationStatus as "supported" | "verified" }));
  return <PlannerApp policy={policy} areas={areas} />;
}
