{pkgs, ...}: {
  packages = [
    pkgs.nodejs_20
    pkgs.supabase-cli
  ];
  
  # Add this preview configuration
  idx.previews = {
    enable = true;
    previews = {
      web = {
        command = [
          "npm"
          "run"
          "dev"
          "--"
          "--port"
          "3000"
          "--hostname"
          "0.0.0.0"
        ];
        manager = "web";
      };
    };
  };
}
