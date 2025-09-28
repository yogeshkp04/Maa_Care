import Image from "next/image";
import { IoIosChatbubbles, IoMdQrScanner } from "react-icons/io";
import { Utensils, LayoutDashboard } from 'lucide-react';
import { MdLogout ,MdDocumentScanner} from "react-icons/md";
import Link from "next/link";


export default function NavBar() {
  return (<>
    <div className="h-[97%] w-[6%]  bg-purple-500  rounded-tl-3xl rounded-bl-3xl ml-4 drop-shadow flex flex-col items-center"><Link className="contents" href="/" ><Image className="-ml-4 mt-4" alt="logo" src="/logo.png" height={45} width={45} /></Link>
      <div className="-ml-3 mt-50 flex flex-col gap-5">
        <Link href="/chat"> <IoIosChatbubbles className="text-white h-7 w-7  transition-transform duration-200 hover:scale-115" /></Link>
        <MdDocumentScanner className="text-white h-6.5 w-6.5 transition-transform duration-200 hover:scale-115" />
        <Link href="/scan"><IoMdQrScanner className="text-white h-7 w-7 transition-transform duration-200 hover:scale-117" /></Link>
        <Link href="/yoga" ><Image src="/yoga6.png" height={37} width={37} alt="yoga" className="-ml-0.5 transition-transform duration-200 hover:scale-115" /></Link>
        <Link href="/dashboard" ><LayoutDashboard className="text-white h-7.5 w-7.5 transition-transform duration-200 hover:scale-110" strokeWidth={1.3} /></Link>
        <MdLogout className="text-white h-7 w-7 mt-47 " />
      </div>
    </div>
  </>)
}