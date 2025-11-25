import { useAccount, useSwitchChain } from "wagmi";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/solid";
import { getTargetNetworks } from "~~/utils/helper";

const allowedNetworks = getTargetNetworks();

type NetworkOptionsProps = {
  hidden?: boolean;
};

export const NetworkOptions = ({ hidden = false }: NetworkOptionsProps) => {
  const { switchChain } = useSwitchChain();
  const { chain } = useAccount();

  return (
    <>
      {allowedNetworks
        .filter(allowedNetwork => allowedNetwork.id !== chain?.id)
        .map(allowedNetwork => (
          <li key={allowedNetwork.id} className={hidden ? "hidden" : ""}>
            <button
              className="glass-card px-4 py-2 flex gap-3 items-center hover:bg-[#D9D9D9] transition-colors text-[#2D2D2D] font-medium whitespace-nowrap"
              type="button"
              onClick={() => {
                switchChain?.({ chainId: allowedNetwork.id });
              }}
            >
              <ArrowsRightLeftIcon className="h-5 w-5" />
              <span>Switch to {allowedNetwork.name}</span>
            </button>
          </li>
        ))}
    </>
  );
};
