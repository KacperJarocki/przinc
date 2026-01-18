terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.117.1"
    }
    azuread = {
      source = "hashicorp/azuread"
    }
  }
}
