import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { ReptileFormSheet } from "@/components/reptile-form-sheet";

export default function EditReptileScreen() {
  const { animal } = useAnimalRoute();

  if (!animal) return <AnimalNotFound />;

  return <ReptileFormSheet animal={animal} />;
}
