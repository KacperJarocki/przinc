variable "name_components" {
  type = object({
    project_name = string
    environment  = string
    service      = string
    postfix      = optional(number, 0)
  })
}
variable "inputs" {
  description = "Optional inputs for the module"
  type = object({
    tags = optional(map(string), {})
  })
  default = {}
}
