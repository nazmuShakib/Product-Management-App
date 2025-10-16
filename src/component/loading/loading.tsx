import { FC } from "react";

const Loading: FC = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-12 h-12 border-4 border-warning border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};

export default Loading;
