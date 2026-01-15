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
    config = optional(string)
  })
}
variable "inputs" {
  type = object({
    resource_group_name = string
    location            = string
    subnet_id           = string
    private_dns_zone_id = string
    tags                = optional(map(string), {})
  })
}
