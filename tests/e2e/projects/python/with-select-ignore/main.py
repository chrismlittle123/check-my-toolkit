# File with F401 violation (unused import) - should be caught
# E501 (line too long) is ignored so long lines are ok
import os  # unused import - F401 violation

very_long_variable_name_that_exceeds_typical_line_length = "this is a really really really long string that would normally trigger E501"
print(very_long_variable_name_that_exceeds_typical_line_length)
