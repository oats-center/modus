import streamlit as st

st.title("Soil Sample Uploader")
file = st.file_uploader("Modus Soil File (json or xml)", accept_multiple_files=True)