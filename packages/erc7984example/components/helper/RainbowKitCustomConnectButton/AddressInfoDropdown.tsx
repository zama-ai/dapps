import { useRef, useState } from "react";
import { NetworkOptions } from "./NetworkOptions";
import { Address, getAddress } from "viem";
import { useDisconnect } from "wagmi";
import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import { ArrowsRightLeftIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { BlockieAvatar } from "~~/components/helper";
import { useOutsideClick } from "~~/hooks/helper";
import { getTargetNetworks } from "~~/utils/helper";

const allowedNetworks = getTargetNetworks();

type AddressInfoDropdownProps = {
  address: Address;
  displayName: string;
  ensAvatar?: string;
  blockExplorerAddressLink?: string;
};

export const AddressInfoDropdown = ({ address, ensAvatar, displayName }: AddressInfoDropdownProps) => {
  const { disconnect } = useDisconnect();
  const checkSumAddress = getAddress(address);

  const [selectingNetwork, setSelectingNetwork] = useState(false);
  const dropdownRef = useRef<HTMLDetailsElement>(null);

  const closeDropdown = () => {
    setSelectingNetwork(false);
    dropdownRef.current?.removeAttribute("open");
  };

  useOutsideClick(dropdownRef, closeDropdown);

  return (
    <>
      <details ref={dropdownRef} className="dropdown dropdown-end leading-3">
        <summary className="glass-card px-3 py-2 dropdown-toggle gap-2 flex items-center cursor-pointer list-none">
          <BlockieAvatar address={checkSumAddress} size={30} ensImage={ensAvatar} />
          <span className="ml-1 mr-1 font-semibold text-[#2D2D2D]">{displayName}</span>
          <ChevronDownIcon className="h-5 w-5 text-[#2D2D2D]" />
        </summary>
        <ul className="dropdown-content menu z-[20] p-3 mt-2 glass-card-strong gap-2 min-w-[200px]">
          <NetworkOptions hidden={!selectingNetwork} />
          {allowedNetworks.length > 1 ? (
            <li className={selectingNetwork ? "hidden" : ""}>
              <button
                className="glass-card px-4 py-2 flex gap-3 items-center hover:bg-[#D9D9D9] transition-colors text-[#2D2D2D] font-medium"
                type="button"
                onClick={() => {
                  setSelectingNetwork(true);
                }}
              >
                <ArrowsRightLeftIcon className="h-5 w-5" /> <span>Switch Network</span>
              </button>
            </li>
          ) : null}
          <li className={selectingNetwork ? "hidden" : ""}>
            <button
              className="glass-card px-4 py-2 flex gap-3 items-center hover:bg-[#D9D9D9] transition-colors text-[#2D2D2D] font-medium"
              type="button"
              onClick={() => disconnect()}
            >
              <ArrowLeftIcon className="h-5 w-5" /> <span>Disconnect</span>
            </button>
          </li>
        </ul>
      </details>
    </>
  );
};
