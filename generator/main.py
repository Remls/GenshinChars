from template_replacements import generate_index_file, prettify
from json_generator import generate_data_file

if __name__ == '__main__':
    generate_index_file()
    prettify()
    generate_data_file()