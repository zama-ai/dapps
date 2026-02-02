import { FHEBenchmark } from "../_components/FHEBenchmark";

export default function BenchmarkPage() {
  return (
    <div className="flex flex-col gap-8 items-center w-full px-3 md:px-0">
      <div className="text-center space-y-2 mb-4">
        <h1 className="text-2xl font-bold">FHE Performance Benchmark</h1>
        <p className="text-sm opacity-70 max-w-lg">
          Test encryption performance across different FHE types (uint8, uint16, uint32, uint64, uint128, uint256, address).
        </p>
      </div>
      <FHEBenchmark />
    </div>
  );
}
