# Run `nix-shell` before using npm/node in this project, e.g.:
#   nix-shell --run "npm run dev"
{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
	packages = with pkgs; [
		nodejs
	];
}
