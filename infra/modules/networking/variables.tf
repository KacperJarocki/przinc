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
    vnet_address_space = list(string)
    subnets = map(object({
      subnet_address_prefixes = list(string)
    }))
  })
}
variable "inputs" {
  type = object({
    resource_group_name = string
    location            = string
    tags                = optional(map(string), {})
  })
}
