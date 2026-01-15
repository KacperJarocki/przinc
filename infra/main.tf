terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source = "hashicorp/azurerm"
    }
  }
}

provider "azurerm" {
  features {}
}

module "rg" {
  source = "./modules/rg"

  name_components = {
    project_name = "bhd"
    environment  = "dev"
    service      = "rg"
  }
}
module "networking" {
  source = "./modules/networking"
  name_components = {
    project_name = "bhd"
    environment  = "dev"
    service      = "net"
  }
  configuration = {
    vnet_address_space = ["10.0.0.0/16"]
    subnets = {
      aks_systempool = {
        subnet_address_prefixes = ["10.0.1.0/24"]
      }

      aks_userpool = {
        subnet_address_prefixes = ["10.0.2.0/24"]
      }

      pe = {
        subnet_address_prefixes = ["10.0.3.0/24"]
      }
    }
    private_dns_zones = {
      keyvault = "privatelink.vaultcore.azure.net"
      acr      = "privatelink.azurecr.io"
      postgres = "privatelink.postgres.database.azure.com"
    }
  }
  inputs = {
    resource_group_name = module.rg.name
    location            = module.rg.location
  }

}
module "monitoring" {
  source = "./modules/monitoring"
  name_components = {
    project_name = "bhd"
    environment  = "dev"
    service      = "log"
  }

  configuration = {}
  inputs = {
    resource_group_name = module.rg.name
    location            = module.rg.location
  }
}
module "aks" {
  source = "./modules/aks"
  name_components = {
    project_name = "bhd"
    environment  = "dev"
    service      = "aks"
  }
  inputs = {
    resource_group_name     = module.rg.name
    location                = module.rg.location
    subnet_id               = module.networking.subnets["aks_systempool"].id
    acr_subnet_id           = module.networking.subnets["pe"].id
    log_analytics_id        = module.monitoring.id
    acr_private_dns_zone_id = module.networking.private_dns_zone_ids["acr"]
  }
  configuration = {}

}
