#!/bin/bash
set echo off

export DST_DIR="../imports/api/common/static_codegen"
echo Building proto files...

protoc \
    -I=../.proto \
    --js_out=import_style=commonjs:${DST_DIR} \
    --ts_out=${DST_DIR} \
    ../.proto/tmq/*.proto
echo "export default proto.tmq;" | tee -a ${DST_DIR}/tmq/*.js
echo Done building proto files!
