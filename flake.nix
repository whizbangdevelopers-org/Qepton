{
  description = "Qepton - AI Prompt and Code Snippet Manager powered by GitHub Gist";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachSystem [ "x86_64-linux" ] (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        qepton = pkgs.callPackage ./nix/default.nix { };
      in
      {
        packages = {
          default = qepton;
          qepton = qepton;
        };

        apps.default = {
          type = "app";
          program = "${qepton}/bin/qepton";
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            nodePackages.npm
            electron
          ];
        };
      }
    ) // {
      overlays.default = final: prev: {
        qepton = final.callPackage ./nix/default.nix { };
      };
    };
}
