import React from "react"

const VegetableCard = ({
  name,
  specification,
  categories,
  markets,
  price_date,
  onClick
}) => {

  const formatPrice = (price) =>
    price === null || price === undefined ? "N/A" : `₱${price}`

  return (
    <div
      onClick={onClick}
      className="bg-white shadow-md hover:shadow-xl transition rounded-2xl p-6 cursor-pointer"
    >
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">{name}</h2>
        <p className="text-gray-500 text-sm">{categories}</p>
        <p className="text-gray-500 text-sm">{specification}</p>
        <p className="text-gray-400 text-xs">{new Date(price_date).toLocaleDateString()}</p>
      </div>

      <div className="border-t my-4"></div>

      {Object.entries(markets).map(([market, prices]) => (
        <div key={market} className="space-y-1 mb-3 text-gray-700">
          <div className="flex justify-between font-medium">
            <span>{market}</span>
            <span>{formatPrice(prices.prevailing)}</span>
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <span>High</span>
            <span>{formatPrice(prices.high)}</span>
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <span>Low</span>
            <span>{formatPrice(prices.low)}</span>
          </div>
        </div>
      ))}

    </div>
  )
}

export default VegetableCard