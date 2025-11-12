import { NetworkOptions } from "./NetworkOptions";
import { useDisconnect } from "wagmi";
import { ArrowLeftOnRectangleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export const WrongNetworkDropdown = () => {
  const { disconnect } = useDisconnect();

  return (
    <div className="dropdown dropdown-end mr-2">
      <label tabIndex={0} className="glass-button !bg-[rgba(255,69,58,0.85)] text-white px-4 py-2 rounded-xl dropdown-toggle gap-2 flex items-center cursor-pointer font-semibold">
        <span>Wrong network</span>
        <ChevronDownIcon className="h-5 w-5" />
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content menu p-3 mt-2 glass-card-strong rounded-2xl gap-2 min-w-[200px] z-[20]"
      >
        <NetworkOptions />
        <li>
          <button
            className="glass-card px-4 py-2 rounded-xl flex gap-3 items-center hover:bg-[rgba(255,69,58,0.2)] transition-colors text-[#ff453a] font-medium"
            type="button"
            onClick={() => disconnect()}
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            <span>Disconnect</span>
          </button>
        </li>
      </ul>
    </div>
  );
};
