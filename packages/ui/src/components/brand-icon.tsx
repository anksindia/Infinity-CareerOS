import { cn } from "@reactive-resume/utils/style";

type Props = React.ComponentProps<"img">;

export function BrandIcon({ className, ...props }: Props) {
	return <img src="/logo.png" alt="Infinity CareerOS" className={cn("size-12", className)} {...props} />;
}
