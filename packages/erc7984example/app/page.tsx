import { ERC7984Demo } from "./_components/ERC7984Demo";
import { PublicDecryptDemo } from "./_components/PublicDecryptDemo";

export default function Home() {
  return (
    <div className="flex flex-col gap-8 items-center sm:items-start w-full px-3 md:px-0">
      <ERC7984Demo />
      <PublicDecryptDemo />
    </div>
  );
}
