interface CardProps {
    className?: string;
    title?:string;
    desc?:string;
    img?:React.ReactNode
}

export default function Card({desc="",title="" ,className="",img}: CardProps) {
    return(<>
       <div className={`bg-white w-[350px] h-[185px] rounded-lg drop-shadow-md text-center flex-shrink-0 ${className}`}>
        {img}
       <h1 className="pt-2 text-3xl  text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500  bg-clip-text inline-block">{title ? title:""}</h1>
       <div>
       <h1 className="pt-2 text-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-transparent bg-clip-text inline-block">{desc ? desc:""} </h1>
       </div>
       </div> 
    </>)
}