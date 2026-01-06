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
    vnet_address_space = ["10.0.0.1/16"]
    subnets = {
      aks = {
        subnet_address_prefixes = ["10.0.0.1/24"]
      }

      database = {
        subnet_address_prefixes = ["10.0.0.2/24"]
      }
    }
  }
  inputs = {
    resource_group_name = module.rg.name
    location            = module.rg.location
  }

}
