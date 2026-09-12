import { VaeloraApp } from "../components/vaelora-app";
import { v1WeatherPolicy } from "../server/recommendations/policy";

export default function Home() {
  const policy = {
    running: { maxPreferredWind: v1WeatherPolicy.activities.running.windKmh.preferred[1], maxPreferredHeat: v1WeatherPolicy.activities.running.temperatureC.preferred[1] },
    walking: { maxPreferredWind: v1WeatherPolicy.activities.walking.windKmh.preferred[1], maxPreferredHeat: v1WeatherPolicy.activities.walking.temperatureC.preferred[1] },
  };
  return <VaeloraApp policy={policy} />;
}
