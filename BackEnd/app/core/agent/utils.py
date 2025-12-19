import re
from typing import List

def extract_xml_tag(xml_str: str, tag: str) -> str:
    start_tag = f"<{tag}>\n"
    end_tag = f"\n</{tag}>"
    start = xml_str.find(start_tag)
    if start == -1:
        return ""
    start += len(start_tag)
    end = xml_str.find(end_tag, start)
    if end == -1:
        return ""
    # 删去最前面、最后面的换行符和空格
    while xml_str[start] in [' ', '\n']:
        start += 1
    while xml_str[end - 1] in [' ', '\n']:
        end -= 1
    return xml_str[start:end]