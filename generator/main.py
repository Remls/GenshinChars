from template_replacements import generate_characters_page, generate_index_page, update_domains_page, prettify_characters_page
from json_generator import generate_characters_file, generate_domains_file, generate_hsr_characters_file, generate_hsr_domains_file

if __name__ == '__main__':
    generate_characters_page()
    prettify_characters_page()
    generate_index_page()
    update_domains_page()
    generate_characters_file()
    generate_domains_file()
    generate_hsr_characters_file()
    generate_hsr_domains_file()