import { t } from "@lingui/core/macro";
import { GithubLogoIcon, StarIcon } from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui/components/button";

export function GithubStarsButton() {
	return (
		<Button
			variant="secondary"
			nativeButton={false}
			render={
				<a
					target="_blank"
					href="https://github.com/reactive-resume/reactive-resume"
					aria-label={t`Star us on GitHub (opens in new tab)`}
					rel="noopener noreferrer"
				>
					<GithubLogoIcon aria-hidden="true" />
					<StarIcon aria-hidden="true" />
				</a>
			}
		/>
	);
}
