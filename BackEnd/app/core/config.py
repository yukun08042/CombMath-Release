import os
from pathlib import Path
from typing import Dict, List, Literal, Optional, Tuple, Type
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)
from pydantic_settings import (
    BaseSettings,
    InitSettingsSource,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
    YamlConfigSettingsSource,
)

# 加载 .env 文件
from dotenv import load_dotenv
load_dotenv()


class Endpoint(BaseModel):
    # 防止前缀为 model_ 的配置有冲突
    model_config = ConfigDict(protected_namespaces=())
    
    api_type: Optional[str] = None
    api_key: str
    api_base: Optional[str] = None
    api_version: Optional[str] = None
    organization: Optional[str] = None
    model_engine_map: Optional[Dict[str, str]] = None



# ref: https://github.com/pydantic/pydantic/discussions/4170#discussioncomment-9668111
class YamlBaseSettings(BaseSettings):
    # 在初始化设置实例时，可明确指定使用的配置文件路径
    yaml_file: Optional[Path] = None
    
    # 如果初始化时未指定具体配置文件路径，则自动搜索如下配置文件名
    # 列表中越靠后优先级越高
    model_config = SettingsConfigDict(
        yaml_file=['config.yml', 'config.yaml'],
        # extra='ignore',
    )
    
    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: Type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> Tuple[PydanticBaseSettingsSource, ...]:
        assert isinstance(init_settings, InitSettingsSource)
        init_yaml_file = init_settings.init_kwargs.get("yaml_file")
        if init_yaml_file:
            # 如果初始化时指定了配置文件路径，则使用指定的配置文件
            return (YamlConfigSettingsSource(settings_cls, yaml_file=init_yaml_file),)
        else:
            # 否则使用默认搜索到的配置文件
            return (YamlConfigSettingsSource(settings_cls),)


class Settings(YamlBaseSettings):    
    endpoints: List[Endpoint] = Field(..., min_length=1)
    # openai_chat_model: str
    # shared_data_dir: Path
    
# 从环境变量中读取配置文件路径，如果未设置则为None，使用默认搜索配置文件名
# yaml_path = os.environ.get("DISGLUE_CONFIG_PATH")
yaml_path = Path(__file__).parent.parent.parent.parent / "credentials.yaml"
print(f"Using config file: {yaml_path}")
settings = Settings(yaml_file=yaml_path) # type: ignore

