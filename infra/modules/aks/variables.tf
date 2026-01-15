variable "name_components" {
  type = object({
    project_name = string
    environment  = string
    service      = string
    postfix      = optional(number, 0)
  })
}

variable "configuration" {
  type = object({
    node_vm_size     = optional(string, "Standard_B4ms")
    node_count       = optional(number, 1)
    enable_autoscale = optional(bool, false)
    min_count        = optional(number, 1)
    max_count        = optional(number, 3)
    use_spot         = optional(bool, true)
    spot_max_price   = optional(number, -1)
  })
}

variable "inputs" {
  type = object({
    resource_group_name     = string
    location                = string
    subnet_id               = string
    acr_subnet_id           = string
    acr_private_dns_zone_id = string
    log_analytics_id        = optional(string)
    tags                    = optional(map(string), {})
  })
}

