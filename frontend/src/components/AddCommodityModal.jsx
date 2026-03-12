import React, { useState, useEffect } from "react"
import { useVegetableStore } from "../store/VegetableStore.js"
import { IoCloseCircle } from "react-icons/io5";


const AddCommodityModal = ({ isOpen, OnClose }) => {

  const { categories, fetchCategories, addCommodity } = useVegetableStore()

  const [form, setForm] = useState({
    category_id: "",
    name: "",
    specification: ""
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const result = await addCommodity(form)

    if (result.success) {
      setForm({
        category_id: "",
        name: "",
        specification: ""
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal modal-open">

      <div className="modal-box max-w-80">

        <span className="flex gap-30 justify-around flex-row-reverse">
        <IoCloseCircle onClick={OnClose} size={30} color="white" className="mb-5"/>
        <h2 className="text-xl text-black font-bold mb-4">
            Add Commodity
        </h2>
        </span>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* CATEGORY */}
          <select
            name="category_id"
            className="select select-bordered "
            value={form.category_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Category</option>

            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}

          </select>

          {/* NAME */}
          <input
            type="text"
            name="name"
            placeholder="Commodity Name"
            className="input input-bordered "
            value={form.name}
            onChange={handleChange}
            required
          />

          {/* SPECIFICATION */}
          <input
            type="text"
            name="specification"
            placeholder="Specification (optional)"
            className="input input-bordered "
            value={form.specification}
            onChange={handleChange}
          />

          <div className="modal-action">

            <button
              type="button"
              className="btn"
              onClick={OnClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
            >
              Add Commodity
            </button>

          </div>

        </form>

      </div>

    </div>
  )
}

export default AddCommodityModal