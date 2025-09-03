# To learn more about how to use Nix to configure your environment,
# see: https://developers.google.com/idx/guides/customize-idx-env
{pkgs, ...}: {
  # Which nixpkgs channel to use.
  channel = "stable-23.11"; # Or "unstable"
  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20
    # pkgs.go
    # pkgs.python3
    # pkgs.cowsay
  ];
  # Sets environment variables in the workspace
  env = {};
  # Fast way to run commands before the IDE starts
  pre-create = {
    # Example:
    # "npm-install" = "npm install";
  };
  # Enter the shell for direct access to Nix and follow the instructions on how to use it
  init = {
    # Example:
    # "welcome" = {
    #   command = ''
    #     echo "Welcome to your IDX-powered development environment!"
    #   '';
    # };
  };
}
