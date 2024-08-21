import { ClientOnly } from "./components/ClientOnly";
import { W3Auth } from "./Web3Auth";

export default function Home() {
  return (
    <ClientOnly>
      <W3Auth />
    </ClientOnly>
  );
}
