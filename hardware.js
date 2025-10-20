export async function startPayment(amount, onStatus) {
    const res = await fetch("http://10.66.66.63:8080/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
    });
    const data = await res.json();
    const uuid = data.data.uuid;

    const intervalId = setInterval(async () => {
        const qRes = await fetch("http://10.66.66.63:8080/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uuid })
        });
        const qData = await qRes.json();
        onStatus(qData);

        if (
            qData.data.info.status !== "paying" &&
            qData.data.info.status !== "processing"
        ) {
            clearInterval(intervalId);
        }
    }, 1000);
}