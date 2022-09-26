def load_template() -> str:
    file_contents = ""
    with open('data/template.html') as f:
        file_contents = f.read()
    return file_contents

def load_photo_cache_from_file() -> str:
    file_contents = ""
    try:
        with open('data/_photo_cache') as f:
            file_contents = f.read()
    except FileNotFoundError:
        pass
    return file_contents.split("\n")

def add_to_photo_cache_file(char_name: str):
    with open('data/_photo_cache', 'a') as f:
        f.write(char_name + "\n")

def get_title_with_image(key: str, ext: str = "svg") -> str:
    if key.startswith("Unknown"):
        return "Unknown"
    else:
        return f"<img width=\"50\" height=\"50\" src=\"assets/images/{key}.{ext}\"><br>{key}"

def get_counter_data(data: dict, possible_keys: list, key_icons: dict, input: str) -> str:
    display = []
    for k in possible_keys:
        count = data[k][input]
        icon = key_icons[k]
        if count > 0:
            display.append(f"<b>{icon}</b> {count}")
    return '<br>'.join(display)