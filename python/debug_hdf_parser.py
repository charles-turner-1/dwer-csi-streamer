import numcodecs.zarr3
from obspec_utils.registry import ObjectStoreRegistry
from obstore.store import S3Store
from virtualizarr import open_virtual_dataset
from virtualizarr.parsers import HDFParser

endpoint = "https://projects.pawsey.org.au"
bucket = "s3://zarr-data-stream-test"
file_pseudopath = "output/SWWA/WA-DWER/ERA5/historical/r1i1p1f1/R3/v1/mon/pr/pr_SWWA_ERA5_historical_r1i1p1f1_R3_v1_mon_198001-198012.nc"


store = S3Store.from_url(
    f"{bucket}",
    endpoint=endpoint,
    skip_signature=True,
)

registry = ObjectStoreRegistry({f"{bucket}": store})

parser = HDFParser()


url = f"{bucket}/{file_pseudopath}"

breakpoint()
open_virtual_dataset(
    url=url,
    parser=parser,
    registry=registry,
    decode_times=False,
)
