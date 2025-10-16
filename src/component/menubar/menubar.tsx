"use client";
import Image from "next/image";
import { FC, ReactNode, useState, useEffect } from "react";
import { deleteCookie, getCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import { TbLogout } from "react-icons/tb";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/store";
import { setToken } from "@/store/authSlice";
import Loading from "@/component/loading/loading";

const MenuBar: FC<{ children: ReactNode }> = ({ children }) => {
  const [openLogoutPopUp, setOpenLogoutPopUp] = useState(false);

  const token = useSelector((state: RootState) => state.auth.token);
  const dispatch = useDispatch();

  const handleLogout = () => {
    console.log("Logging out...");
    setOpenLogoutPopUp(true);
  };

  useEffect(() => {
    dispatch(setToken(getCookie("jwt") as string));
  }, [token]);

  if (!token) return <Loading />;

  return (
    <div>
      <div className="h-16 bg-foreground/15 flex justify-between items-center p-2 sm:p-4 md:p-6 lg:p-8">
        <div className="text-foreground flex gap-2 items-center">
          <Image
            src="/product-management.png"
            alt="Logo"
            width={40}
            height={30}
            className="filter invert"
          />
          <div className="max-w-16">
            <p className="text-sm">Product Management</p>
          </div>
        </div>
        <div
          onClick={handleLogout}
          className="hover:cursor-pointer flex flex-col items-center text-error-message"
        >
          <TbLogout size={24} />
          <span className="text-sm">Logout</span>
        </div>
      </div>
      {children}
      {openLogoutPopUp && (
        <LogoutPopUp handleLogout={() => setOpenLogoutPopUp(false)} />
      )}
    </div>
  );
};

const LogoutPopUp: FC<{ handleLogout: () => void }> = ({ handleLogout }) => {
  const router = useRouter();

  return (
    <div className="fixed inset-0 bg-background/50 bg-opacity-50 flex justify-center items-center z-50 transition-all duration-200">
      <div className="w-[90%] px-2 py-4 md:w-[60%] md:p-4 lg:w-[40%] lg:p-6 xl:w-[30%] bg-foreground/30 rounded-lg shadow-md">
        <p className="text-center text-lg md:text-xl lg:text-2xl mb-4">
          Are you sure you want to logout?
        </p>
        <div className="flex justify-around">
          <button
            className="p-2 bg-error text-white rounded hover:bg-error-message transition-all duration-200 ease-linear hover:cursor-pointer"
            onClick={() => {
              deleteCookie("jwt");
              router.refresh();
              handleLogout();
            }}
          >
            Logout
          </button>
          <button
            className="p-2 bg-gray-400 rounded hover:bg-gray-500 transition-all duration-200 ease-linear hover:cursor-pointer"
            onClick={handleLogout}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuBar;
